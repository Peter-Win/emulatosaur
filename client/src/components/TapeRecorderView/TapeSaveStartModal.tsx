import * as React from "react";
import z from "zod";
import axios from "axios";
import { TapeRecorderStore } from "./TapeRecorderStore";
import { observer } from "mobx-react-lite";
import { Alert, Checkbox, Flex, Form, Input, Modal, Radio } from "antd";
import { hexWord, rxHexWord } from "common/format";
import { onError } from "src/utils/onError";
import { msgQueueStore } from "../MsgQueue";

type PropsTapeSaveStartModal = {
  store: TapeRecorderStore;
}

type WrMethod = "direct" | "emulate";

const modeOptions: {label: string, value: WrMethod}[] = [
  {label: "Напрямую", value: "direct"},
  {label: "Эмуляция", value: "emulate"},
];

type TapeSaveFormData = {
  fileName: string;
  rewrite?: boolean;
  method: WrMethod;
  begin: string;
  end: string;
}

const fld = (key: keyof TapeSaveFormData) => key;

export const TapeSaveStartModal: React.FC<PropsTapeSaveStartModal> = observer(({store}) => {
  const {mode} = store;
  const open = mode === "saveStart";
  const [form] = Form.useForm<TapeSaveFormData>();
  const [askRewrite, setAskRewrite] = React.useState(false);
  const updateAskRewrite = (need: boolean) => {
    form.setFieldValue(fld("rewrite"), false);
    setAskRewrite(need);
  }
  const [dataSize, setDataSize] = React.useState<number | undefined>()
  React.useEffect(() => {
    if (open) {
      form.setFieldsValue({
        fileName: "",
        rewrite: false,
        method: "direct",
        begin: "",
        end: "",
      });
      setAskRewrite(false);
    }
  }, [open]);
  const currentMethod: string = Form.useWatch("method", form) ?? modeOptions[0]?.value;
  React.useEffect(() => {
    console.log("currentMethod", currentMethod);
  }, [currentMethod]);
  const onValuesChange = (changed: Partial<TapeSaveFormData>, all: TapeSaveFormData) => {
    if ((fld("begin") in changed) || (fld("end") in changed)) {
      setDataSize(calcDataSize(all.begin, all.end))
    }
    if (fld("fileName") in changed) {
      const checkedName = all.fileName;
      if (checkedName) {
        axios("/api/checkFileName", {params: {name: checkedName}})
        .then((resp) => {
          if (form.getFieldValue(fld("fileName")) === checkedName) {
            const data = z.object({exists: z.boolean()}).parse(resp.data);
            updateAskRewrite(data.exists);
          }
        })
        .catch(onError);
      } else {
        updateAskRewrite(false);
      }
    }
  }
  const onFinish = ({method, fileName, begin, end}: TapeSaveFormData) => {
    const onSuccess = () => {
      msgQueueStore.add({type: "success", description: `Выполнена запись в файл ${fileName}`});
    }
    if (method === "emulate") {
      store.emulateSave(fileName).then(onSuccess).catch(onError);
    } else if (method === "direct") {
      const nBegin = parseInt(begin, 16);
      const nEnd = parseInt(end, 16);
      store.directSave(fileName, nBegin, nEnd).then(onSuccess).catch(onError);
    }
    store.setMode(null);
  }
  return (
    <Modal
      title="Запись в RKM-файл"
      centered
      open={open}
      onCancel={() => store.setMode(null)}
      okText="Start"
      okButtonProps={{htmlType: "submit"}}
      modalRender={(content) => (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          onFinish={onFinish}
        >
          {content}
        </Form>
      )}
    >
      <Form.Item
        label="Имя файла (без расширения)"
        name={fld("fileName")}
        rules={[{required: true, message: "Требуется имя файла"}]}
      >
        <Input allowClear />
      </Form.Item>
      {askRewrite && <Form.Item 
        name={fld("rewrite")}
        label={null}
        valuePropName="checked" 
        rules={[{
          validator: async (_, value) => {
            if (!value) throw Error(msgRewrite);
          }
        }]}
      >
        <Checkbox>Файл с таким именем уже существует. Перезаписать?</Checkbox>
      </Form.Item>}
      <Form.Item name={fld("method")} label="Как будет выполняться запись" tooltip={tooltipMethod}>
        <Radio.Group
          block
          options={modeOptions}
          defaultValue="direct"
          optionType="button"
          buttonStyle="solid"
        />
      </Form.Item>
      {currentMethod === "direct" && (
        <Flex vertical>
          <Flex gap={16}>
            <Form.Item 
              style={{flex: 1}} 
              label="Адрес начала" 
              name={fld("begin")}
              rules={[
                {required: true, message: msgRequired},
                {pattern: rxHexWord, message: msgHex},
              ]}
            >
              <Input allowClear maxLength={4} />
            </Form.Item>
            <Form.Item 
              style={{flex: 1}} 
              label="Адрес конца (включительно)" 
              name={fld("end")}
              dependencies={["begin"]}
              rules={[
                {required: true, message: msgRequired},
                {pattern: rxHexWord, message: msgHex},
                {validator: async (_, value = "") => {
                  const locSize = calcDataSize(form.getFieldValue("begin"), value);
                  if (typeof locSize === "number" && locSize <= 0) throw Error(msgRange);
                }},
              ]}
            >
              <Input allowClear maxLength={4} />
            </Form.Item>
          </Flex>
          {typeof dataSize === "number" && dataSize > 0 && (
            <div>
              Размер данных: {dataSize} (<code>{hexWord(dataSize)}</code>) байт.
            </div>
          )}
        </Flex>
      )}
      {currentMethod === "emulate" && <Alert type="info" description={msgEmul} showIcon />}
    </Modal>
  )
});

const tooltipMethod = "Если Напрямую, то данные из памяти эмулятора будут сразу записаны в файл. Если Эмуляция, то будет производиться эмуляция побитовой записи.";
const msgRequired = "Требуется заполнить поле";
const msgHex = "Требуется Hex-число (16 bit)";
const msgRange = "Не может быть меньше, чем адрес начала";
const msgRewrite = "Требуется подтверждение";
const msgEmul = "После нажатия на кнопку Start необходимо за короткое время ввести на клавиатуре команду записи.";

const calcDataSize = (begin: unknown, end: unknown): number | undefined => {
  if (typeof begin !== "string" || typeof end !== "string") return undefined;
  const nBegin = parseInt(begin, 16);
  const nEnd = parseInt(end, 16);
  if (Number.isNaN(nBegin) || Number.isNaN(nEnd)) return undefined;
  return nEnd - nBegin + 1;
}