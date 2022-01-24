export class Requester {
  private latestResponseExecutionTime = 0;
  private buffer: AbortController[] = [];
  private maxBuffer = 4;

  public get hasPendingRequests(): boolean {
    return this.buffer.length !== 0;
  }

  public async request(url, params?) {
    const controller = new AbortController();
    const executionTime = Date.now();

    if (this.buffer.length > this.maxBuffer) {
      this.buffer[0].abort();
      this.buffer.splice(0, 1);
    }

    this.buffer.push(controller);

    const response = await fetch(url, {
      ...params,
      signal: controller.signal,
    });

    if (response.status !== 200) {
      this.cleanBuffer(controller);
      throw response;
    }

    if (this.latestResponseExecutionTime > executionTime) {
      this.cleanBuffer(controller);
      throw new Error('Prev response');
    }

    this.latestResponseExecutionTime = executionTime;

    const data = await response.json();

    this.cleanBuffer(controller);

    return data;
  }

  private cleanBuffer(controller) {
    this.buffer = this.buffer.filter((ctrl) => ctrl !== controller);
  }
}
