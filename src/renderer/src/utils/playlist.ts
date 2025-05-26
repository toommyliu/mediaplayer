// import { playlistState, type Playlist, type PlaylistItem } from "../state.svelte";

// export class PlaylistManager {
//   static createPlaylist(name: string, description?: string): Playlist {
//     const newPlaylist: Playlist = {
//       id: crypto.randomUUID(),
//       name,
//       description,
//       items: [],
//       createdAt: new Date(),
//       lastModified: new Date()
//     };

//     playlistState.playlists.push(newPlaylist);
//     return newPlaylist;
//   }

//   static deletePlaylist(playlistId: string): boolean {
//     const index = playlistState.playlists.findIndex((p) => p.id === playlistId);
//     if (index === -1 || playlistId === "default") return false;

//     playlistState.playlists.splice(index, 1);

//     // If we deleted the current playlist, switch to default
//     if (playlistState.currentPlaylistId === playlistId) {
//       playlistState.currentPlaylistId = "default";
//     }

//     return true;
//   }

//   static renamePlaylist(playlistId: string, newName: string): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     playlist.name = newName;
//     playlist.lastModified = new Date();
//     return true;
//   }

//   static switchToPlaylist(playlistId: string): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     playlistState.currentPlaylistId = playlistId;
//     return true;
//   }

//   static addItemToPlaylist(
//     playlistId: string,
//     item: Omit<PlaylistItem, "id" | "addedAt">
//   ): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     const newItem: PlaylistItem = {
//       ...item,
//       id: crypto.randomUUID(),
//       addedAt: new Date()
//     };

//     playlist.items.push(newItem);
//     playlist.lastModified = new Date();
//     return true;
//   }

//   static removeItemFromPlaylist(playlistId: string, itemId: string): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     const index = playlist.items.findIndex((item) => item.id === itemId);
//     if (index === -1) return false;

//     playlist.items.splice(index, 1);
//     playlist.lastModified = new Date();
//     return true;
//   }

//   static clearPlaylist(playlistId: string): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     playlist.items = [];
//     playlist.lastModified = new Date();
//     return true;
//   }

//   static shufflePlaylist(playlistId: string): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     // Fisher-Yates shuffle algorithm
//     for (let i = playlist.items.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [playlist.items[i], playlist.items[j]] = [playlist.items[j], playlist.items[i]];
//     }

//     playlist.lastModified = new Date();
//     return true;
//   }

//   static duplicatePlaylist(playlistId: string): Playlist | null {
//     const sourcePlaylist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!sourcePlaylist) return null;

//     const duplicatedPlaylist: Playlist = {
//       id: crypto.randomUUID(),
//       name: `${sourcePlaylist.name} (Copy)`,
//       description: sourcePlaylist.description,
//       items: sourcePlaylist.items.map((item) => ({
//         ...item,
//         id: crypto.randomUUID(),
//         addedAt: new Date()
//       })),
//       createdAt: new Date(),
//       lastModified: new Date()
//     };

//     playlistState.playlists.push(duplicatedPlaylist);
//     return duplicatedPlaylist;
//   }

//   static moveItem(playlistId: string, fromIndex: number, toIndex: number): boolean {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return false;

//     if (
//       fromIndex < 0 ||
//       fromIndex >= playlist.items.length ||
//       toIndex < 0 ||
//       toIndex >= playlist.items.length
//     ) {
//       return false;
//     }

//     const [movedItem] = playlist.items.splice(fromIndex, 1);
//     playlist.items.splice(toIndex, 0, movedItem);
//     playlist.lastModified = new Date();
//     return true;
//   }

//   static getPlaylistStats(playlistId: string) {
//     const playlist = playlistState.playlists.find((p) => p.id === playlistId);
//     if (!playlist) return null;

//     const totalDuration = playlist.items.reduce((sum, item) => sum + (item.duration || 0), 0);
//     const totalSize = playlist.items.reduce((sum, item) => sum + (item.size || 0), 0);

//     return {
//       itemCount: playlist.items.length,
//       totalDuration,
//       totalSize,
//       avgDuration: playlist.items.length > 0 ? totalDuration / playlist.items.length : 0
//     };
//   }
// }
