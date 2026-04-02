import * as React from "react";
import { observer } from "mobx-react-lite";
import { Alert, Button, Flex, Input, Modal, Table, TableColumnsType, Tabs } from "antd";
import { TapeRecorderStore } from "./TapeRecorderStore";
import z from "zod";
import { delay } from "common/delay";
import { FunnelPlotOutlined } from "@ant-design/icons";
import { onError } from "src/utils/onError";
import { hexWord } from "common/format";
import { msgQueueStore } from "../MsgQueue";
import axios from "axios";

type PropsTapeLoadStartModal = {
  store: TapeRecorderStore;
}

type SrcType = "data" | "userData";
type DataStatus = "ok" | "wait" | "error";

export const TapeLoadStartModal: React.FC<PropsTapeLoadStartModal> = observer(({store}) => {
  const [src, setSrc] = React.useState<SrcType>("data");
  const [rows, setRows] = React.useState<ZFile[]>([]);
  const [dataStatus, setDataStatus] = React.useState<DataStatus>("ok");
  const [selectedName, setSelectedName] = React.useState("");
  const [error, setError] = React.useState<Error | undefined>();
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState<"emul" | "direct" | undefined>();
  const open = store.mode === "loadStart";
  React.useEffect(() => {
    if (open) {
      setSelectedName("");
    }
  }, [open]);
  const canSubmit = !!selectedName;
  const visibleRows: ZFile[] = React.useMemo(() => {
    if (!search) return rows;
    const part = search.toLowerCase();
    return rows.filter(({name}) => name.toLowerCase().includes(part));
  }, [rows, search]);

  React.useEffect(() => {
    setRows([]);
    setDataStatus("wait");
    setSelectedName("");
    setError(undefined);
    loadFiles(src).then((list) => {
      setRows(list);
      setDataStatus("ok");
    }).catch((e) => {
      setDataStatus("error");
      setError(e);
    });
  }, [src]);
  const onSearch = (value: string) => {
    setSearch(value);
  }
  const onDirectLoad = () => {
    setLoading("direct");
    store.load(src, selectedName).then((begin) => {
      const msgLoadSuccess = "Данные загружены по адресу {A}. Используйте для запуска директиву G";
      const message = msgLoadSuccess.replace("{A}", hexWord(begin));
      msgQueueStore.add({type: "success", message});
      store.setMode(null);
    }).finally(() => setLoading(undefined)).catch(onError);
  }
  const onEmulate = () => {
    setLoading("emul");
    store.emulateRead(src, selectedName).then(() => {
      store.setMode(null);
    }).finally(() => setLoading(undefined)).catch(onError);
  }
  return (
    <Modal
      title="Чтение из файла"
      open={open}
      onCancel={() => store.setMode(null)}
      centered
      destroyOnHidden
      footer={<Flex gap={10}>
        <div style={{flex: 1}} />
        <Button 
          type="primary" 
          title={titleEmul} 
          disabled={!canSubmit || loading === "direct"}
          loading={loading === "emul"}
          onClick={onEmulate}
        >
          Эмуляция
        </Button>
        <Button 
          type="primary" 
          title={titleDirect} 
          disabled={!canSubmit || loading === "emul"} 
          loading={loading === "direct"}
          onClick={onDirectLoad}
        >
          Быстрое чтение
        </Button>
      </Flex>}
    >
      <Input 
        value={search} 
        onChange={(e) => onSearch(e.currentTarget.value)} 
        prefix={<FunnelPlotOutlined />} 
        allowClear
        placeholder="Имя файла"
      />
      <Tabs activeKey={src} onChange={(k: string) => setSrc(k as SrcType)} items={srcItems} />
      <Table<ZFile>  
        size="small"
        columns={columns} 
        dataSource={visibleRows}
        rowKey="name" 
        loading={dataStatus === "wait"}
        scroll={{y: 350}}
        rowSelection={{
          type: "radio",
          selectedRowKeys: [selectedName],
          onSelect: ({name}) => setSelectedName(name),
        }}
        pagination={false}
        locale={{
          emptyText: error ? <Alert type="error" title="Error" description={error.message} showIcon /> : undefined,
        }}
      />
    </Modal>
  )
});

const srcItems: {key: SrcType, label: string}[] = [
  {key: "data", label: "Системные программы"},
  {key: "userData", label: "Пользовательские данные"},
];

const titleEmul = "После нажатия на эту кнопку нужно за короткое время ввести на клавиатуре команду загрузки. (Н.р. директиву I)";
const titleDirect = "Только для файлов, у которых есть стандартный заголовок";

const zFile = z.object({
  name: z.string(),
  size: z.number(),
});
type ZFile = z.infer<typeof zFile>;

const columns: TableColumnsType<ZFile> = [
  {
    key: "name",
    title: "Name",
    render: (_, {name}) => name,
  },
  {
    key: "size",
    title: "Size",
    render: (_, {size}) => new Intl.NumberFormat(navigator.language).format(size),
  },
];

const loadFiles = async (src: SrcType): Promise<ZFile[]> => {
  const resp = await axios.get("/api/files", {params: {src}});
  return zFile.array().parse(resp.data);
}