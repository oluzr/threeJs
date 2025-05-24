// src/data/dummyData.ts

export interface DummyDevice {
  UID: string;
  Name: string;
  GroupUID: string;
  Slug: string;
  DeviceIp: string;
  Status: "green" | "yellow" | "red";
}

export interface DummyGroup {
  uid: string;
  title: string;
  ParentUID: string | null;
}

export const dummyGroups: DummyGroup[] = [
  { uid: "g1", title: "Group A", ParentUID: null },
  { uid: "g2", title: "Group B", ParentUID: "g1" },
  { uid: "g3", title: "Group C", ParentUID: "g1" },
  { uid: "g4", title: "Sub Group B1", ParentUID: "g2" },
];

export const dummyDevices: DummyDevice[] = [
  {
    UID: "d1",
    Name: "Device 1",
    GroupUID: "g1",
    Slug: "device-1",
    DeviceIp: "10.0.0.1",
    Status: "green",
  },
  {
    UID: "d2",
    Name: "Device 2",
    GroupUID: "g2",
    Slug: "device-2",
    DeviceIp: "10.0.0.2",
    Status: "red",
  },
  {
    UID: "d3",
    Name: "Device 3",
    GroupUID: "g2",
    Slug: "device-3",
    DeviceIp: "10.0.0.3",
    Status: "yellow",
  },
  {
    UID: "d4",
    Name: "Device 4",
    GroupUID: "g3",
    Slug: "device-4",
    DeviceIp: "10.0.0.4",
    Status: "green",
  },
  {
    UID: "d5",
    Name: "Device 5",
    GroupUID: "g4",
    Slug: "device-5",
    DeviceIp: "10.0.0.5",
    Status: "red",
  },
];

export function getDummyDevices() {
  return dummyDevices;
}

export function getDummyGroups() {
  return dummyGroups;
}
