import { Flex, Switch } from "antd";
import * as React from "react";

type PropsBeeper = {
  active: boolean;
}

class Audio {
  audioCtx: AudioContext;
  osc: OscillatorNode;
  gain: GainNode;
  constructor() {
    this.audioCtx = new AudioContext();
    this.osc = new OscillatorNode(this.audioCtx, {
      type: "square",
      frequency: 1568, // соль 3 окт
    });
    // Rather than creating a new oscillator for every start and stop
    // which you would do in an audio application, we are just going
    // to mute/un-mute for demo purposes - this means we need a gain node
    const gain = new GainNode(this.audioCtx);
    this.gain = gain;
    const analyser = new AnalyserNode(this.audioCtx, {
      fftSize: 1024,
      smoothingTimeConstant: 0.8,
    });
    this.osc.connect(gain).connect(analyser).connect(this.audioCtx.destination);
    gain.gain.value = 0.1;
  }
  status: "init" | "play" | "pause" = "init";
  setStatus(newStatus: "play" | "pause") {
    this.status = newStatus;
  }
  play(enable: boolean) {
    const {audioCtx, osc, gain} = this;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    if (this.status === "init" && enable) {
      osc.start(audioCtx.currentTime);
      this.setStatus("play");
    } else if (this.status === "pause" && enable) {
      gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.2);
      this.setStatus("play");
    } else if (this.status === "play" && !enable) {
      gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
      this.setStatus("pause");
    }
  }
}

export const Beeper: React.FC<PropsBeeper> = (props) => {
  const {active} = props;
  const [enable, setEnable] = React.useState(false); 

  const audio = React.useMemo(() => new Audio(), []);
  React.useEffect(() => {
    audio.play(active && enable);
  }, [active, enable]);

  return (
    <Flex align="center" gap={6} style={{height: "100%"}}>
      <div style={{width: 12, height: 12, borderRadius: "50%", background: active ? "green" : "gray"}} />
      <Switch size="small" value={enable} onChange={(newState) => setEnable(newState)} title="Enable sound" />
    </Flex>
  );
}