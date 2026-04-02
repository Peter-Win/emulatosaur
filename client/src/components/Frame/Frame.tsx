import * as React from "react";
import * as styles from "./Frame.module.less";

type PropsFrame = {
  title: React.ReactNode;
  tools: React.ReactNode | React.ReactNode[];
  children?: React.ReactNode;
}

export const Frame: React.FC<PropsFrame> = (props) => {
  const {title, tools, children} = props;
  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <div className={styles.title}>
          {title}
        </div>
        <div className={styles.tools}>
          {tools}
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}