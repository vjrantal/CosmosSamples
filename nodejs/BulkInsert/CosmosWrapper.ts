import * as dotenv from 'dotenv';
import { Guid } from "guid-typescript";
import * as fs from 'fs';

import { CosmosClient, CosmosClientOptions, Container, FeedResponse, StoredProcedure, ItemDefinition, ItemResponse } from '@azure/cosmos';
import { Stopwatch } from './Stopwatch';
import { promisify, callbackify } from 'util';
import async from 'async';

export class CosmosWrapper
{
    private readonly client: CosmosClient;
    private container?: Container;
    private readonly DbId = "bulkinsert";
    private readonly ContainerId = "items";
    private storedProcedure?: StoredProcedure;
    private bulkInserted = 0;
    private bulkInsertRus = 0;
    
    constructor(private readonly rus: number) {
        
        dotenv.config();
        
        let options: CosmosClientOptions = {
            endpoint: process.env.Endpoint as string,
            key: process.env.Key as string,
        };

        this.client = new CosmosClient(options);
    }

    public async Setup()
    {
        if(this.container) return;

        const { database } = await this.client.databases.createIfNotExists({ id: this.DbId});
        const containerResult = await database.containers.createIfNotExists({ throughput: this.rus, id: this.ContainerId, partitionKey: { paths: ['/pk'] } });
        this.container = containerResult.container;
        this.storedProcedure = await this.ensureStoredProc('./StoredProcs/spBulkInsert.js', 'spBulkInsertV1');
    }

    public async performInsertParallel(numberOfItems: number, parallelLimit = 10) : Promise<number>
    {
        if(!this.container){
            throw new Error('missing container');
        }
        const targetContainer = this.container;
        const items = CosmosWrapper.createItems(numberOfItems);
        const fn = targetContainer.items.upsert.bind(targetContainer.items);
        let totalRu = 0;

        await promisify(async.forEachLimit.bind(async, items, parallelLimit,
            (t: any, cb: any) => callbackify<ItemResponse<ItemDefinition>>(() => fn(t))((e, result) => {
                totalRu += result.requestCharge;
                cb();
            })))();

        return totalRu;
    }

    public async performInsertUsingSp(numberOfItems: number, useUpsert = false) : Promise<number>
    {
        this.bulkInserted = 0;
        this.bulkInsertRus = 0;
        const items = CosmosWrapper.createItems(numberOfItems);
        await this.performInsertUsingSpCore(items, useUpsert);

        if(this.bulkInserted != numberOfItems)
        {
            throw new Error('not all items inserted');
        }

        return this.bulkInsertRus;
    }

    private async performInsertUsingSpCore(items: any[], useUpsert: boolean) : Promise<void>
    {
        if(!this.storedProcedure) {
            throw new Error('missing stored procedure');
        }

        try
        {
            const result = await this.storedProcedure.execute('bulk', [items]);
            const processedItems = result.resource.processed;
            this.bulkInsertRus += result.requestCharge;
            this.bulkInserted += processedItems;

            if(processedItems < items.length)
            {
                await this.performInsertUsingSpCore(items.slice(processedItems), useUpsert);
            }
        }
        catch(err)
        {
            if(err.code === 413) // too large request
            {
                console.error('request too large');
                // split until we have a small enough size
                let mid = items.length >> 1;
                await Promise.all([this.performInsertUsingSpCore(items.slice(0, mid), useUpsert), this.performInsertUsingSpCore(items.slice(mid), useUpsert)]);
            }
            else 
            {
                throw err;
            }
        }
    }

    private static createItems(numberOfItems: number): any[]
    {
        const numberOfAttributes = 10;
        const items = new Array(numberOfItems);
        const attributes = new Array<any>(numberOfAttributes);

        for(var i=0;i<numberOfAttributes;i++){
            attributes[i] = {Key: i.toString(), Value: 'Value_' + i};
        }

        for(var i=0;i<numberOfItems;i++) {            
            items[i] = {
                id: Guid.create().toString(),
                pk: 'bulk',
                Name: 'name_' + i,
                Attributes: attributes,
                url: 'http://1234567890/1234567890/1234567890/1234567890/1234567890/1234567890/1234567890/1234567890/1234567890/1234567890/1234567890'
            };
        }
        return items;
    }

    private async ensureStoredProc(file: string, id: string) : Promise<StoredProcedure> {

        if(!this.container){
            throw new Error('missing container');
        }

        const readFile = promisify(fs.readFile);
        let data = await readFile(file);
        let content = data.toString();


        let storedProcDef = {
            body: content,
            id: id
        };

        let existingSp = this.container.scripts.storedProcedure(id);

        try {
            const result = await existingSp.replace(storedProcDef);
            console.log("stored proc updated");
            
            return result.storedProcedure;
        }
        catch(e)
        {
            if(e.code == 404) {
                const result = await this.container.scripts.storedProcedures.create(storedProcDef);

                console.log("stored proc created");
                return result.storedProcedure;
            }
            else{
                throw e;
            }
        }
    }
}