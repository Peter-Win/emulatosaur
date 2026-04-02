import * as React from "react";
import "antd/dist/reset.css";
import { MainFrame } from "./components/MainFrame";
import  "./style.less";
import { ConfigProvider } from "antd";
import { MsgQueue } from "./components/MsgQueue";

export const App: React.FC = () => {
  return (
    <ConfigProvider>
      <MainFrame />
      <MsgQueue />
    </ConfigProvider>
  );
}