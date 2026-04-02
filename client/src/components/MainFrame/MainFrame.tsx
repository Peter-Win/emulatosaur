import * as React from "react";
import * as styles from "./MainFrame.module.less";
import { Menu, MenuProps } from "antd";
import { DebuggerGrid } from "../DebuggerGrid";
import { Microsha } from "common/computer/Microsha";
import { createProc80Emulator } from "common/cpu/i8080/createProc80Emulator";
import { makeAutoObservable } from "mobx";
import { MicroshaView } from "../computers/MicroshaView/MicroshaView";

const comp = new Microsha();
const emulator = makeAutoObservable(createProc80Emulator(comp.cpu, comp));

type MenuItem = Required<MenuProps>['items'][number];


export const MainFrame: React.FC = () => {
  const items: MenuItem[] = [
    {
      label: 'File',
      key: 'file',
      children: [
        {
          key: "newProject",
          label: "New project",
        },
        {
          key: "openProject",
          label: "Open project",
        },
      ],
    },  
  ];
  return (
    <div className={styles.mainFrame}>
      {/* <Menu mode="horizontal" items={items} /> */}
      <div style={{flex: 1}}>
        <MicroshaView />
      </div>
    </div>
  );
}

        // <DebuggerGrid
        //   comp={comp} 
        //   cpu={comp.cpu} 
        //   startAddr={comp.startExecAddr} 
        //   emulator={emulator}
        //   defaultCharset="МИКРОША"
        // />
