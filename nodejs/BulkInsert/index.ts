import { CosmosWrapper } from "./CosmosWrapper";
import { Stopwatch } from "./Stopwatch";

(async () => {
    
    const rusToConfigure = process.env.RUS ? parseInt(process.env.RUS) : 8000;
    const numberOfItems = process.env.NumberOfItems ? parseInt(process.env.NumberOfItems) : 5000;

    const client = new CosmosWrapper(rusToConfigure);
    await client.Setup();
    
    const sw = new Stopwatch();

    const chunkSize = 2500;

    let items = CosmosWrapper.createItems(numberOfItems);

    sw.restart();
    let rus = await client.performInsertUsingSp(numberOfItems, false, true, items, chunkSize);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Insert, chunk: ${chunkSize}`);

    items = CosmosWrapper.createItems(numberOfItems);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, false, true, items);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Insert`);

    items = CosmosWrapper.createItems(numberOfItems);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, true, true, items, chunkSize);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Upsert, chunk: ${chunkSize}`);

    items = CosmosWrapper.createItems(numberOfItems);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, true, true, items);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Upsert`);
})();