import { CosmosWrapper } from "./CosmosWrapper";
import { Stopwatch } from "./Stopwatch";

(async () => {
    
    const rusToConfigure = process.env.RUS ? parseInt(process.env.RUS) : 8000;
    const numberOfItems = process.env.NumberOfItems ? parseInt(process.env.NumberOfItems) : 5000;

    const client = new CosmosWrapper(rusToConfigure);
    await client.Setup();
    
    const sw = new Stopwatch();
    sw.restart();

    let maxParallelReq = 40;
    sw.restart();
    let rus = await client.performInsertParallel(numberOfItems, maxParallelReq);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, Parallel-${maxParallelReq}`);
    
    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, false);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Insert`);

    const items = CosmosWrapper.createItems(numberOfItems);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, true, false, items);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Upsert`);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, false, true, items);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Insert Ignore`);

})();