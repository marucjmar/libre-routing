export class Dispatcher {
  private callbacks = {};

  public fire(event, data) {
    (this.callbacks[event] || []).forEach((callback) => callback(data));
  }

  public on(event, callback) {
    this.callbacks[event] = [...(this.callbacks[event] || []), callback];
  }

  public off(event, callback) {
    this.callbacks[event] = (this.callbacks[event] || []).filter(
      (c) => c !== callback
    );
  }
}
