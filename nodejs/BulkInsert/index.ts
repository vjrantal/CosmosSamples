import { CosmosWrapper } from "./CosmosWrapper";
import { Stopwatch } from "./Stopwatch";

(async () => {
    const client = new CosmosWrapper(8000);
    await client.Setup();
    
    let numberOfItems = 5000;
    const sw = new Stopwatch();
    sw.restart();

    let maxParallelReq = 40;
    let rus = 0;
    sw.restart();
    rus = await client.performInsertParallel(numberOfItems, maxParallelReq);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus} Parallel-${maxParallelReq}`);

    maxParallelReq = 50;
    sw.restart();
    rus = await client.performInsertParallel(numberOfItems, maxParallelReq);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, Parallel-${maxParallelReq}`);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, false);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Insert`);

    sw.restart();
    rus = await client.performInsertUsingSp(numberOfItems, true);
    sw.logElapsedTime(`${numberOfItems}, RUs: ${rus}, SP-Upsert`);

})();