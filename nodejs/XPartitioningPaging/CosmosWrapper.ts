import dotenv from 'dotenv';
import { Guid } from "guid-typescript";
import { IItem } from "./Item";
import proxy from 'https-proxy-agent';

import { CosmosClient, CosmosClientOptions, Container, FeedResponse } from '@azure/cosmos';
import { Stopwatch } from './Stopwatch';
import { Stats } from './Stats';

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
        
        var enableProxy = (process.env.EnableProxy as string)?.toLowerCase() == 'true';
        var agentProxy: proxy | undefined;

        if(enableProxy)
        {
            agentProxy = new proxy({ rejectUnauthorized: false, host:'localhost', port: 8888});
        }

        let options: CosmosClientOptions = {
            endpoint: process.env.Endpoint as string,
            key: process.env.Key as string,
            agent: agentProxy
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

    public async queryXPartition(orderByClause?: string)
    {
        await this.Setup();
        if(!this.container) return;

        const stats = new Stats();

        let response: FeedResponse<IItem>;
        const limit = 100;
        
        let hasMore = false;
        do {
            const queryString = `SELECT * FROM c ${orderByClause || ''} OFFSET ${stats.totalFetched} LIMIT ${limit}`;
            const query = this.container.items.query(queryString, { maxItemCount: limit, bufferItems: true, useIncrementalFeed: true });
            
            stats.StartOperation();
            response = await query.fetchNext() as FeedResponse<IItem>;
            if (!response.resources) break;
            stats.StopOperation(response);
            hasMore = response.resources.length == limit;
        } while(hasMore);

        stats.PrintStats();
    }

    public async queryXPartitionInMemory(orderByClause?: string)
    {
        await this.Setup();
        if(!this.container) return;

        let response: FeedResponse<IItem>;
        let limit = 100;
        const stats = new Stats();
        
        const queryString = "SELECT * FROM c" + (orderByClause || '');

        let query = this.container.items.query(queryString, { maxItemCount: limit });
        while(query.hasMoreResults())
        {
            stats.StartOperation();
            response = await query.fetchNext() as FeedResponse<IItem>;
            if (!response.resources) break;
            stats.StopOperation(response);

            if (response.continuationToken)
            {
                // if we get a continuation token, we throw, this is not expected in this test
                throw 'we got a continuation token';
            }
        }

        stats.PrintStats();
    }
}