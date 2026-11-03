import { ClienteResumen } from "../../App";
import type { ReactElement } from "react";

export type ClientMapProps = {
  clientes: ClienteResumen[];
  selectedId: number | null;
  editing: boolean;
  onSelect: (cliente: ClienteResumen) => void;
  onMove: (
    cliente: ClienteResumen,
    latitude: number,
    longitude: number,
  ) => void;
};

export declare function ClientMap(props: ClientMapProps): ReactElement;
