"use client";

import { ReactPhotoSphereViewer } from "react-photo-sphere-viewer";

type Props = {
  src: string;
};

export default function PanoramaViewer({ src }: Props) {
  return (
    <ReactPhotoSphereViewer
      src={src}
      height={"100%"}
      width={"100%"}
      defaultZoomLvl={0}
      touchmoveTwoFingers={false}
      mousewheelCtrlKey={false}
      navbar={["zoom", "move", "fullscreen"]}
      loadingTxt="Chargement…"
    />
  );
}
