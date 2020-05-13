# Cosmos Cross partition queries and paging

## JavaScript SDK limitations

There are some limitations when you use the JavaScript SDK when you perform cross partition queries that require ORDER BY clauses and they need to be pagable. The JavaScript SDK does not expose the continuationToken header when you perform that query, hence you can't continue easily using the normal paging semantics.

## Workaround

The OFFSET / LIMIT in SQL queries can be used to imitate the same. The performance characteristics are similar, but slightly slower than if you would be using a continuation token:

The sample app, does add 1000 items to a container and does puts each of them on a logical partition. Then we run 2 scenarios:

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

Each iteation captures the elapsed time and adds a sample:

### Perf & RUs

Both scenarios fetched 1000 items in 10 rquests, 100 items per response. Times are in milliseconds.

#### Samples

|Scenario|1|2|3|4|5|6|7|8|9|10|
|-|-|-|-|-|-|-|-|-|-|-|
|1|627|839|1104|1371|1636|1884|2127|2393|2630|2720|
|2|554|791|1029|1258|1550|1799|2481|2532|2616|2807|

#### Totals

|Scenario|Elapsed total time|RUs spent|
|-|-|-|
|1|17331|74.6|
|2|17417|436.22|

## Conclusion

It can be solved using OFFSET / LIMIT, however the higher the page, the more expensive are the RUs (each page basically doubles the RUs spent of the previous request). Performance wise, we are in the same ballpark.
