import { CosmosWrapper } from "./CosmosWrapper";

(async () => {
    const client = new CosmosWrapper();
    const orderByLastChanged = ' ORDER BY c.lastChanged ASC';
    // await client.queryXPartition(false, orderByLastChanged);
    //await client.queryXPartition(false);
    await client.queryXPartitionInMemory(orderByLastChanged);
    await client.queryXPartition(true, orderByLastChanged);
})();