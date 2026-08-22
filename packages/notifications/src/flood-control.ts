export class NotificationFloodControl {
  private userSentTimestamps = new Map<string, number[]>();
  private readonly maxPerHour: number;
  private readonly maxPerMinute: number;

  constructor(options?: { maxPerHour?: number; maxPerMinute?: number }) {
    this.maxPerHour = options?.maxPerHour || 50;
    this.maxPerMinute = options?.maxPerMinute || 10;
  }

  public shouldAllow(userId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    let timestamps = this.userSentTimestamps.get(userId);
    if (!timestamps) {
      timestamps = [];
      this.userSentTimestamps.set(userId, timestamps);
    }

    // Retain only timestamps from the last hour
    timestamps = timestamps.filter((t) => t > oneHourAgo);
    this.userSentTimestamps.set(userId, timestamps);

    const countLastHour = timestamps.length;
    const countLastMinute = timestamps.filter((t) => t > oneMinuteAgo).length;

    if (countLastHour >= this.maxPerHour || countLastMinute >= this.maxPerMinute) {
      return false; // Flood detected
    }

    timestamps.push(now);
    return true;
  }

  public reset(userId: string): void {
    this.userSentTimestamps.delete(userId);
  }
}

export const globalFloodControl = new NotificationFloodControl();
