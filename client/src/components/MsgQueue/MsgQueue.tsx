import { notification } from "antd";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { msgQueueStore } from "src/components/MsgQueue";

const Context = React.createContext({ name: "Default" });

export const MsgQueue: React.FC = observer(() => {
  const { list } = msgQueueStore;

  const [api, contextHolder] = notification.useNotification();

  const contextValue = React.useMemo(() => ({ name: "Ant Design" }), []);

  React.useEffect(() => {
    if (list.length > 0) {
      list.forEach((msg) => {
        api.open({ ...msg, placement: "bottomRight" });
      });
      msgQueueStore.clear();
    }
  }, [list.length]);
  return (
    <Context.Provider value={contextValue}>{contextHolder}</Context.Provider>
  );
});
