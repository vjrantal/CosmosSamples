import { CosmosWrapper } from "./CosmosWrapper";

(async () => {
    const client = new CosmosWrapper();
    const orderByLastChanged = ' ORDER BY c.name DESC';
    // await client.queryXPartitionInMemory(orderByLastChanged);
    await client.queryXPartitionRegular(orderByLastChanged);
    //await client.queryXPartition(orderByLastChanged);
})();