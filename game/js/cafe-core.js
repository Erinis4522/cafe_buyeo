// 화면과 무관한 영업 시간·알바생 작업. 맡긴 주문은 자체 레시피와 아트를 보관한다.
const CAFE = (() => {
  function displayMinutes(minutes, step = 30) {
    return Math.floor(minutes / step) * step;
  }

  class Shift {
    constructor({ daySeconds = 300, openHour = 9, closeHour = 21 } = {}) {
      this.duration = daySeconds * 1000;
      this.open = openHour * 60;
      this.close = closeHour * 60;
      this.elapsed = 0;
    }
    advance(ms) { this.elapsed = Math.min(this.duration, this.elapsed + Math.max(0, ms)); }
    get minutes() { return this.open + this.elapsed / this.duration * (this.close - this.open); }
    get closed() { return this.elapsed >= this.duration; }
  }

  class Worker {
    constructor() { this.job = null; }
    get busy() { return !!this.job; }
    start(order, steps, art, stepMs = 9000, artMs = 6000) {
      if (this.busy) return false;
      // A later lesson must never change the drink already being made.
      this.job = {
        order, steps: steps.slice(), art: art ? structuredClone(art) : null,
        elapsed: 0, stepMs, artMs: art ? artMs : 1800,
        duration: steps.length * stepMs + (art ? artMs : 1800)
      };
      return true;
    }
    advance(ms) {
      const job = this.job;
      if (!job) return null;
      job.elapsed = Math.min(job.duration, job.elapsed + Math.max(0, ms));
      if (job.elapsed < job.duration) return null;
      this.job = null;
      return job;
    }
  }

  return { displayMinutes, Shift, Worker };
})();
if (typeof module !== 'undefined') module.exports = CAFE;
