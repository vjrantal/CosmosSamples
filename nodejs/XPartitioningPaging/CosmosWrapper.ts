import dotenv from 'dotenv';
import { Guid } from "guid-typescript";
import { IItem } from "./Item";
import proxy from 'https-proxy-agent';

import { CosmosClient, CosmosClientOptions, Container, FeedResponse } from '@azure/cosmos';
import { Stopwatch } from './Stopwatch';

export class CosmosWrapper
{
    private readonly client: CosmosClient;
    private container?: Container;
    private readonly DbId = "xpartitionqueries";
    private readonly ContainerId = "items";
    private readonly NumberOfItemsToAdd = 1000;
    /**
     *
     */
    constructor() {
        
        dotenv.config();
        
        let agent = new proxy({ rejectUnauthorized: false, host:'localhost', port: 8888});

        let options: CosmosClientOptions = {
            endpoint: process.env.Endpoint as string,
            key: process.env.Key as string,
            agent: agent
        };

        this.client = new CosmosClient(options);
    }

    public async Setup()
    {
        if(this.container) return;

        const { database } = await this.client.databases.createIfNotExists({ id: this.DbId});
        const containerResult = await database.containers.createIfNotExists({ throughput: 1000, id: this.ContainerId, partitionKey: { paths: ['/pk'] } });
        this.container = containerResult.container;  
    }

    public async Seed()
    {
        for(var i=0;i<this.NumberOfItemsToAdd;i++) {
            
            let guid = Guid.create().toString();
            let date = new Date().toDateString();
            let item = {

                id: guid,
                lastChanged: date,
                lastUser: `user-${i}@domain.com`, 
                name: `item-` + i, 
                pk: guid, 
                tags: ['one', 'two']
            };
            this.container?.items.create(item);
        }
    }

    public async queryXPartition(useOffsetLimit: boolean, orderByClause?: string)
    {
        await this.Setup();

        if(!this.container) return;

        let token = '';
        let response: FeedResponse<IItem>;
        let totalFetched = 0;
        let totalRus = 0;
        let limit = 100;
        let numberOfIterations = 0;
        let samples: number[] = [];

        const sw = new Stopwatch();
        do {
            sw.restart();
            const queryString = "SELECT * FROM c" + (orderByClause || '') + (useOffsetLimit ? ` OFFSET ${totalFetched} LIMIT ${limit+1}` : '');

            let query = this.container.items.query(queryString, { maxItemCount: limit, continuationToken: useOffsetLimit ? undefined : token});
            response = await query.fetchNext() as FeedResponse<IItem>;
            
            if (!response.resources) break;

            totalFetched += response.resources.length;
            totalRus += Number(response.requestCharge);

            token = response.continuationToken;
            numberOfIterations++;
            samples.push(Math.floor(sw.totalMilliseconds()));
        } while(token || (useOffsetLimit && response.hasMoreResults));


        this.printStats(samples, totalFetched, numberOfIterations, totalRus);
    }

    public async queryXPartitionInMemory(orderByClause?: string)
    {
        await this.Setup();

        if(!this.container) return;

        let response: FeedResponse<IItem>;
        let totalFetched = 0;
        let totalRus = 0;
        let limit = 100;
        let numberOfIterations = 0;
        let samples: number[] = [];

        const sw = new Stopwatch();
        sw.restart();
        const queryString = "SELECT * FROM c" + (orderByClause || '');

        let query = this.container.items.query(queryString, { maxItemCount: limit });
        while(query.hasMoreResults())
        {
            response = await query.fetchNext() as FeedResponse<IItem>;
            
            if (!response.resources) break;

            totalFetched += response.resources.length;
            totalRus += Number(response.requestCharge);

            numberOfIterations++;
            samples.push(Math.floor(sw.totalMilliseconds()));
        }
        
        this.printStats(samples, totalFetched, numberOfIterations, totalRus);
    }

    private printStats(samples: number[], totalFetched: number, numberOfIterations: number, totalRus: number) {
        console.log('samples: ' + samples.join('\t'));
        let totalMs = 0;
        samples.forEach(x => totalMs += x);
        console.log(`fetched ${totalFetched} in ${totalMs}ms, requests: ${numberOfIterations}, RUs: ${totalRus}`);
    }
}