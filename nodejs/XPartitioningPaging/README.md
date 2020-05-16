# Cosmos Cross partition queries and paging

This is a quick write up on a test we have been conducting to figure out how bad x-partition queries in Cosmos DB are. Here we focus on ORDER BY on top of a x-partition query, but in general it should be stated that whenever you have to perform a query x-partition, you need to update your datamodel and denormalize to be able to query your data on the same partition.

## Why are x-partition queries so bad

It's simple: they don't scale. If your data grows and it has to be distributed to multiple physical partitions, the client has to make multiple queries to fetch the data. Not only that, it will also need to figure out a list of partitions it actually has to query (additional request). Given the fact that you chose Cosmos DB I assume you need the scale of the system and hence, paying attention to scale limiting concepts is utterly important.

That being sayed, here is a quick investigation on what can happen, if you try to make it work anyway.

## JavaScript SDK limitations

> Note: this was written for the [Microsoft Azure Cosmos JavaScript SDK](https://github.com/Azure/azure-cosmos-js/) version 3.6.3.

There are some limitations when you use the JavaScript SDK when you perform cross partition queries that require ORDER BY clauses and they need to be pagable. The JavaScript SDK does not expose the continuationToken header when you perform that query, hence you can't continue easily using the normal paging semantics.

## Try to use OFFSET / LIMIT

The OFFSET / LIMIT in SQL queries can be used to page through content. However, the performance characteristics are completely different (worse).

The sample app, does add 1000 items to a container and does puts each of them on a logical partition. Note, this will never be enough to create another physical partition, so you don't get the overhead here of having to hit multiple partitions, but it still shows how bad the OFFSET / LIMIT can get.

We run 2 scenarios:

We execute 2 paged queries, each 100 items per page performing an ORDER BY

1. We keep the `QueryIterator` alive and loop through the 1000 items in 10 pages. We do not have to take care of a continuation ourselves, it's handled in the `QueryIterator`

   ```typescript
   while(query.hasMoreResults())
   {
      response = await query.fetchNext() as FeedResponse<IItem>;
   }
   ```

1. We use OFFSET / LIMIT in SQL, to mimic a continuation token:

   ```typescript
    do {
       const queryString = "SELECT * FROM c" + (orderByClause || '') + (` OFFSET ${totalFetched} LIMIT ${limit+1}`);

        let query = this.container.items.query(queryString, { maxItemCount: limit, });
        response = await query.fetchNext() as FeedResponse<IItem>;
    } while(response.hasMoreResults);
   ```

   >Note: the limit+1 is required, otherwise the response.hasMoreResults will be false.

1. Run it with the .NET Core SDK and use a continuation token.

Each iteation captures the elapsed time and adds a sample:

### Perf & RUs

Both scenarios fetched 1000 items in 10 requests to the SDK, 100 items per response (in theory). Times are in milliseconds.

#### Samples

|Scenario|1|2|3|4|5|6|7|8|9|10|
|-|-|-|-|-|-|-|-|-|-|-|
|1|258|51|  60|  67|  67|  51|  50|  53|  48|  5|
|2|164|209| 258| 345| 409| 435| 530| 538| 606| 741|
|3|362| 129| 92|  78|  80|  82|  77|  88|  86|  46|

#### Totals

|Scenario|Elapsed total time|RUs spent|
|-|-|-|
|1|710|74.6|
|2|4235|436.22|
|3|1120|141.74|

#### Explanation

There are multiple requests happening. I quickly explain what happens in scenario 2.

First of all, if you perform a X-Partition query, without any additional logic, you will get a 400 back for your first query:

>'The provided cross partition query can not be directly served by the gateway. This is a first chance (internal) exception that all newer clients will know how to handle gracefully. This exception is traced, but unless you see it bubble up as an exception (which only happens on older SDK clients), then you can safely ignore this message.'

I wouldn't ignore that mesage. In case where you can't keep the client instance around (I assume most of the scenarios these days with stateless design), you will get this extra round trip for each request.

Now the client needs to figure out, what partition range it has to query and makes another request to the server and makes a request to colls/items/pkranges. That's another request in the books.

That can certainly be optimized, since you should know when you are performing a x-partition query and you can fetch the partition range before and avoid the first request.

Now, we get to the real problem. The client has to perform request 55(!) to fetch the pages (excluding the additional 2 above that it has to do for each new page request).

If you compare the RUs, the difference is massive. 74.6 for scenario 1 and 436.22 for scenario 2. How can it be that scenario 2 is much more expensive for the 10 requests? It does not perform 10 requests. It performs 55(!). It does effectively always load all pages to the client that you OFFSET + your page that you actually need. If you request page 4 it loads 4 pages. The SDK only exposes you page number 4, so you think you just loaded that data. You didn't.

## Conclusion

Technically, you can get the feature working, however, at a very high price and it should be avoided at all times. Not only in conjunction with ORDER BY are x-partition queries a bad idea. Even if your datasest is small to start with, they will most certainly bite you back in the future and limit the scalability of your app.
