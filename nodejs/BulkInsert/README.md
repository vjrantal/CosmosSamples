# Cosmos node bulk inserts

You can optimize your bulk inserts when using the Javascript SDK. The most efficient way to insert a large amount of items is a stored procedure that does bulk insert the items for you.

|Scenario|Number of Items|RUs used|Time in ms|
|-|-:|-:|-:|
|Parallel 40 max|5000|66'650|15'292|
|SP insert|5000|65'359|8'834|
|SP upsert|5000|65'336|13'359|
|SP insert 100% conflict|5000|4'662|11'730|

## Conclusion

When having large number of items that need to be inserted, a stored procedure is the fastest way to do that. Furthermore, having 40 parallel requests handled by your client, will eventually stop scaling. As it is also superior in terms of RUs, I recommend using this approach when working with the Javascript SDK.
