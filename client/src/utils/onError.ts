import { msgQueueStore } from "src/components/MsgQueue";

export const onError = (e: Error) => {
  console.error(e);
  msgQueueStore.add({type: "error", title: "Error", description: e.message})
}