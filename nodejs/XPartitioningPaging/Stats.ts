import { FeedResponse } from "@azure/cosmos";
import { IItem } from "./Item";
import { Stopwatch } from "./Stopwatch";

export class Stats
{
    public totalFetched = 0;
    public totalRus = 0;
    public numberOfIterations = 0;
    public samples: number[] = [];
    private sw = new Stopwatch();

    public StartOperation()
    {
        this.sw.restart();
    }

    public StopOperation(feedResponse: FeedResponse<IItem>)
    {
        this.totalFetched += feedResponse.resources.length;
        this.totalRus += Number(feedResponse.requestCharge);

        this.numberOfIterations++;
        this.samples.push(Math.floor(this.sw.totalMilliseconds()));
    }

    public PrintStats()
    {
        console.log('samples: ' + this.samples.join('\t'));
        let totalMs = 0;
        this.samples.forEach(x => totalMs += x);
        console.log(`fetched ${this.totalFetched} in ${totalMs}ms, requests: ${this.numberOfIterations}, RUs: ${this.totalRus}`);
    }
}