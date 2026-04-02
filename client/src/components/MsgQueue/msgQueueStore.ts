import { ArgsProps } from "antd/lib/notification";
import { makeAutoObservable } from "mobx";

export type Msg = ArgsProps;

export const msgQueueStore = makeAutoObservable({
  list: [] as Msg[],
  add(msg: Msg) {
    this.list.push(msg);
  },
  clear() {
    this.list.length = 0;
  },
});
