import { CosmosWrapper } from "./CosmosWrapper";

(async () => {
    const client = new CosmosWrapper();
    const orderByLastChanged = ' ORDER BY c.lastChanged ASC';
    await client.queryXPartitionInMemory(orderByLastChanged);
    await client.queryXPartition(orderByLastChanged);
})();