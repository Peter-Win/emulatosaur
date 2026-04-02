import * as React from "react";
import * as styles from "./DropdownEditor.module.less";
import { AutoComplete, AutoCompleteProps, Button, Dropdown, Form, FormRule, Input, InputRef, Switch, theme } from "antd";
import type { BaseSelectRef } from '@rc-component/select';

type DropdownInput = {
  type: "input";
  onOk(value: string): void;
  okText?: string;
  placeholder?: string;
  label?: string;
  requiredMsg?: string;
  pattern?: RegExp;
  patternMsg?: string;
  maxLength?: number;
  rules?: FormRule[];
}

type DropdownSwitch = {
  type: "switch";
  value: boolean;
  onOk(newValue: boolean): void;
  okText?: string;
  label?: string;
  msgOn?: string;
  msgOff?: string;
}

type DropdownAutocomplete = {
  type: "autocomplete";
  okText?: string;
  placeholder?: string;
  label?: string;
  requiredMsg?: string;
  rules?: FormRule[];
  onSearch: (value: string) => {label: string; value: string}[];
  onOk(value: string): void;
}

type DropdownEditorContent = DropdownInput | DropdownSwitch | DropdownAutocomplete;

type PropsDropdownEditor = {
  content: DropdownEditorContent;
  children: React.ReactNode;
}

export const DropdownEditor: React.FC<PropsDropdownEditor> = (props) => {
  const {content, children} = props;
  const [isOpen, setOpen] = React.useState(false);
  const refAddr = React.useRef<InputRef>(null);
  const refAuto = React.useRef<BaseSelectRef>(null);
  const [options, setOptions] = React.useState<AutoCompleteProps['options']>([]);
  const { token } = theme.useToken();
  const popupStyle: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };
  const onFinish = (values: unknown) => {
    switch (content.type) {
      case "autocomplete":
        onFinishAuto(content, values);
        break;
      case "input":
        onFinishInput(content, values);
        break;
      case "switch":
        onFinishSwitch(content, values);
        break;
    }
    setOpen(false);    
  }
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (content.type === "switch") {
      form.setFieldsValue({value: content.value} satisfies SwitchValues);
    }
  }, [isOpen]);
  return (
    <Dropdown
      trigger={["click"]}
      open={isOpen}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setTimeout(() => {
          if (content.type === "input") refAddr.current?.focus();
          if (content.type === "autocomplete") refAuto.current?.focus();
        }, 100);
      }}
      popupRender={() => (
        <div style={popupStyle} className={styles.popup}>
          <Form
            layout="inline"
            onFinish={onFinish}
            form={form}
          >
            {content.type === "input" && (
              <div className={styles.row}>
                {content.label && <div>{content.label}</div>}
                <Form.Item name="value" rules={inputRules(content)}>
                  <Input 
                    ref={refAddr} 
                    placeholder={content.placeholder} 
                    maxLength={content.maxLength} 
                    allowClear
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  {content.okText ?? "OK"}
                </Button>
              </div>
            )}
            {content.type === "switch" && (
              <div className={styles.row}>
                {content.label && <div>{content.label}</div>}
                <Form.Item name="value">
                  <Switch checkedChildren={content.msgOn} unCheckedChildren={content.msgOff} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  {content.okText ?? "OK"}
                </Button>
              </div>
            )}
            {content.type === "autocomplete" && (
              <div className={styles.row}>
                {content.label && <div>{content.label}</div>}
                <Form.Item name="value" rules={autocompleteRules(content)}>
                  <AutoComplete 
                    ref={refAuto} 
                    placeholder={content.placeholder} 
                    allowClear
                    showSearch={{onSearch: (v) => {
                      setOptions(v ? content.onSearch(v) : []);
                    }}}
                    options={options}
                    style={{width: 200}}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  {content.okText ?? "OK"}
                </Button>                
              </div>
            )}
          </Form>
        </div>
      )}
    >
      {children}
    </Dropdown>
  )
}

type InputValues = {
  value?: string;
}
type SwitchValues = {
  value: boolean;
}


const inputRules = (content: DropdownInput): FormRule[] => {
  const res: FormRule[] = [];
  if (content.requiredMsg) {
    res.push({required: true, message: content.requiredMsg});
  }
  if (content.pattern) {
    res.push({pattern: content.pattern, message: content.patternMsg});
  }
  content.rules?.forEach(r => res.push(r));
  return res;
}

const autocompleteRules = (content: DropdownAutocomplete): FormRule[] => {
  const res: FormRule[] = [];
  if (content.requiredMsg) {
    res.push({required: true, message: content.requiredMsg});
  }
  content.rules?.forEach(r => res.push(r));
  return res;
}

const onFinishInput = (content: DropdownInput, values: unknown) => {
  const {value} = values as InputValues;
  if (value) {
    content.onOk(value);
  }
}
const onFinishAuto = (content: DropdownAutocomplete, values: unknown) => {
  const {value} = values as InputValues;
  if (value) {
    content.onOk(value);
  }
}


const onFinishSwitch = (content: DropdownSwitch, values: unknown) => {
  const {value} = values as SwitchValues;
  content.onOk(value);
}
