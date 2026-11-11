"use client";

import { useState } from "react";

export type SelectableRoom = {
  id: string;
  code: string;
  name: string;
  faculties: string[];
};

export function FacultyRoomSelect({
  faculties,
  rooms,
  initialFaculty = "",
  initialRoomId = "",
}: {
  faculties: string[];
  rooms: SelectableRoom[];
  initialFaculty?: string;
  initialRoomId?: string;
}) {
  const [faculty, setFaculty] = useState(initialFaculty);
  const [roomId, setRoomId] = useState(initialRoomId);
  const availableRooms = rooms.filter((room) => room.faculties.includes(faculty));

  return (
    <>
      <label>Fakultas<select name="faculty" value={faculty} required onChange={(event) => {
        setFaculty(event.target.value);
        setRoomId("");
      }}>
        <option value="">Pilih fakultas terlebih dahulu</option>
        {faculties.map((name) => <option value={name} key={name}>{name}</option>)}
      </select></label>
      <label>Ruangan<select name="roomId" value={roomId} required disabled={!faculty} onChange={(event) => setRoomId(event.target.value)}>
        <option value="">{faculty ? "Pilih ruangan" : "Pilih fakultas terlebih dahulu"}</option>
        {availableRooms.map((room) => <option value={room.id} key={room.id}>{room.code} — {room.name}</option>)}
      </select></label>
    </>
  );
}
