import AlbumView from "@/components/album/AlbumView";
import Guida from "@/components/Guida";
import { meta } from "@/lib/seo";

export const metadata = meta("album", "/album");

export default function AlbumPage() {
  return (
    <>
      <AlbumView />
      <Guida chiave="album" />
    </>
  );
}
