export class Stopwatch
{
    private startTime = process.hrtime();

    public start()
    {
        this.startTime = process.hrtime();
    }

    public restart()
    {
        this.start();
    }

    public totalMilliseconds() : number
    {
        var hrend = process.hrtime(this.startTime);
        return hrend[0] * 1000 + (hrend[1] / 1000000);
    }

    public logElapsedTime(operation: string)
    {
        console.log(`${operation} took ${this.totalMilliseconds()}ms`);
    }
}