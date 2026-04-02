import * as React from "react";
import { Button, Flex, Progress } from "antd";
import { green, red, yellow } from '@ant-design/colors';
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Beeper } from "../Beeper";
import { TapeRecorderStore } from "./TapeRecorderStore";
import { observer } from "mobx-react-lite";
import { hexWord } from "common/format";
import { msgQueueStore } from "../MsgQueue";
import { TapeSaveStartModal } from "./TapeSaveStartModal";
import { TapeLoadStartModal } from "./TapeLoadStartModal";


type PropsTapeRecorderView = {
  soundOn: boolean;
  store: TapeRecorderStore;
}

export const TapeRecorderView: React.FC<PropsTapeRecorderView> = observer((props) => {
  const { store, soundOn } = props;
  // const download = () => {
  //   store.load().then(begin => {
  //   }).catch(e => console.error(e))
  // }
  return (
    <Flex 
      gap={16} 
      style={{border: "thin solid silver", borderRadius: 3, padding: "4px 16px", background: "linear-gradient(120deg, #FFF, #CCC)"}}
      align="center"
    >
      <Button 
        icon={<DownloadOutlined />}
        title="Начать чтение с магнитофона"
        // onClick={download}
        onClick={() => store.setMode("loadStart")}
        disabled={store.isLoadDisabled}
      />
      <Button
        icon={<UploadOutlined />}
        title="Начать запись на магнитофон"
        onClick={() => store.setMode("saveStart")}
        disabled={store.isSaveDisabled}
      />
      <div style={{flex: 1}}>
        {!!store.waitLimit && <Progress 
          percent={store.waitPercent} 
          steps={5} 
          status={store.waitFailed ? "exception" : undefined}
          strokeColor={[green[6]!, green[6]!, yellow[6]!, yellow[6]!, red[6]!]} 
          showInfo={store.waitPercent === 100}
        />}
        {store.writeCounter !== null && (
          <span>Запись: {store.writeCounter} б.</span>
        )}
        {store.readProgress && <Progress 
          percent={Math.floor(store.readProgress[0] * 100 / store.readProgress[1])}
          style={{width: "50%"}}
        />}
      </div>
      <Beeper active={store.beep === null ? soundOn : store.beep} />
      <TapeLoadStartModal store={store} />
      <TapeSaveStartModal store={store} />
    </Flex>
  );
})