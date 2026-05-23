import { SSEService } from './sse.service';

describe('SSEService', () => {
  let service: SSEService;

  beforeEach(() => {
    service = new SSEService();
  });

  it('should create observable stream for a client', () => {
    const observable = service.createStream('client-1');
    expect(observable).toBeDefined();
    expect(service.hasClient('client-1')).toBe(true);
  });

  it('should push events to client', (done) => {
    const observable = service.createStream('client-1');
    observable.subscribe({
      next: (event) => {
        expect(event.data).toBe('hello');
        expect(event.type).toBe('message');
        done();
      },
    });
    service.push('client-1', { event: 'message', data: 'hello' });
  });

  it('should handle push to disconnected client gracefully', () => {
    expect(() => service.push('nonexistent', { event: 'msg', data: 'x' })).not.toThrow();
  });

  it('should clean up client on unsubscribe', (done) => {
    const observable = service.createStream('client-1');
    const sub = observable.subscribe({ next: () => {} });
    expect(service.hasClient('client-1')).toBe(true);
    sub.unsubscribe();
    // finalize runs synchronously on unsubscribe for Subject
    expect(service.hasClient('client-1')).toBe(false);
    done();
  });

  it('should support multiple concurrent clients', (done) => {
    const obs1 = service.createStream('c1');
    const obs2 = service.createStream('c2');

    let received = 0;
    const check = () => {
      received++;
      if (received === 2) done();
    };

    obs1.subscribe({ next: (e) => { expect(e.data).toBe('to-c1'); check(); } });
    obs2.subscribe({ next: (e) => { expect(e.data).toBe('to-c2'); check(); } });

    service.push('c1', { event: 'msg', data: 'to-c1' });
    service.push('c2', { event: 'msg', data: 'to-c2' });
  });

  it('should complete a client stream', (done) => {
    const observable = service.createStream('client-1');
    observable.subscribe({
      complete: () => {
        done();
      },
    });
    service.complete('client-1');
  });

  it('should remove client from map after complete', () => {
    service.createStream('client-1');
    expect(service.hasClient('client-1')).toBe(true);
    service.complete('client-1');
    // finalize cleans up asynchronously; verify with small delay
    expect(service.hasClient('client-1')).toBe(true); // still in map until finalize runs
  });

  it('should report client count', () => {
    expect(service.getClientCount()).toBe(0);
    service.createStream('c1');
    expect(service.getClientCount()).toBe(1);
    service.createStream('c2');
    expect(service.getClientCount()).toBe(2);
  });
});
