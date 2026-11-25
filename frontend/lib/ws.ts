import { wsUrl } from "./api";
import type { ClientMsg, ServerMsg } from "./messages";
import { useRoom } from "./store";

const tokenKey = (code: string) => `token:${code}`;
export const getToken = (code: string) =>
  typeof window === "undefined" ? null : window.localStorage.getItem(tokenKey(code));
export const saveToken = (code: string, token: string) =>
  window.localStorage.setItem(tokenKey(code), token);
export const clearToken = (code: string) => window.localStorage.removeItem(tokenKey(code));

export class RoomSocket {
  private ws: WebSocket | null = null;
  private closed = false;
  private tries = 0;
  constructor(
    private code: string,
    private first: () => ClientMsg,
  ) {}

  connect() {
    useRoom.getState().setStatus("connecting");
    const ws = new WebSocket(wsUrl(`/ws/rooms/${this.code}`));
    this.ws = ws;
    ws.onopen = () => {
      this.tries = 0;
      useRoom.getState().setStatus("open");
      ws.send(JSON.stringify(this.first()));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as ServerMsg;
      if (msg.type === "joined") saveToken(this.code, msg.token);
      useRoom.getState().apply(msg);
    };
    ws.onclose = () => {
      useRoom.getState().setStatus("closed");
      if (this.closed || this.tries > 20) return;
      this.tries += 1;
      setTimeout(() => !this.closed && this.connect(), Math.min(1000 * this.tries, 4000));
    };
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
