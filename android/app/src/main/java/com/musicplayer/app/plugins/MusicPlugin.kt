package com.musicplayer.app.plugins

import android.Manifest
import android.content.ContentUris
import android.os.Build
import android.provider.MediaStore
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(
    name = "MusicPlugin",
    permissions = [
        Permission(
            strings = [Manifest.permission.READ_MEDIA_AUDIO],
            alias = "audio"
        ),
        Permission(
            strings = [Manifest.permission.READ_EXTERNAL_STORAGE],
            alias = "storage"
        )
    ]
)
class MusicPlugin : Plugin() {

    @PluginMethod
    fun getLibrary(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasPermission(Manifest.permission.READ_MEDIA_AUDIO)) {
                requestAllPermissions(call, "permissionCallback")
                return
            }
        } else {
            if (!hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)) {
                requestAllPermissions(call, "permissionCallback")
                return
            }
        }

        loadLibrary(call)
    }

    @PluginMethod
    fun permissionCallback(call: PluginCall) {
        loadLibrary(call)
    }

    private fun loadLibrary(call: PluginCall) {
        val songs = JSArray()
        val context = this.context ?: run {
            call.reject("No context available")
            return
        }

        val uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.ALBUM_ID
        )

        // Also query genres separately since they're in a different table
        val genreMap = HashMap<Long, String>()
        try {
            val genreUri = MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI
            context.contentResolver.query(genreUri, arrayOf(MediaStore.Audio.Genres._ID, MediaStore.Audio.Genres.NAME), null, null, null)?.use { genreCursor ->
                val genreIdCol = genreCursor.getColumnIndexOrThrow(MediaStore.Audio.Genres._ID)
                val genreNameCol = genreCursor.getColumnIndexOrThrow(MediaStore.Audio.Genres.NAME)
                while (genreCursor.moveToNext()) {
                    val genreId = genreCursor.getLong(genreIdCol)
                    val genreName = genreCursor.getString(genreNameCol) ?: "Unknown"
                    val membersUri = MediaStore.Audio.Genres.Members.getContentUri("external", genreId)
                    context.contentResolver.query(membersUri, arrayOf(MediaStore.Audio.Genres.Members.AUDIO_ID), null, null, null)?.use { membersCursor ->
                        val audioIdCol = membersCursor.getColumnIndexOrThrow(MediaStore.Audio.Genres.Members.AUDIO_ID)
                        while (membersCursor.moveToNext()) {
                            genreMap[membersCursor.getLong(audioIdCol)] = genreName
                        }
                    }
                }
            }
        } catch (_: Exception) {
            // Genre query failed, continue without genres
        }

        val selection = "${MediaStore.Audio.Media.DURATION} > ?"
        val selectionArgs = arrayOf("10000")
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

        try {
            context.contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val albumCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                val durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val dataCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val albumIdCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)

                while (cursor.moveToNext()) {
                    val song = JSObject()
                    val id = cursor.getLong(idCol)
                    song.put("id", id.toString())
                    song.put("title", cursor.getString(titleCol) ?: "Unknown")
                    song.put("artist", cursor.getString(artistCol)?.let {
                        if (it == "<unknown>") "Unknown Artist" else it
                    } ?: "Unknown Artist")
                    song.put("album", cursor.getString(albumCol) ?: "Unknown Album")
                    song.put("duration", cursor.getLong(durationCol))
                    song.put("path", cursor.getString(dataCol) ?: "")
                    song.put("albumId", cursor.getLong(albumIdCol).toString())
                    song.put("genre", genreMap[id] ?: "Unknown")
                    songs.put(song)
                }
            }
        } catch (e: Exception) {
            call.reject("Failed to query media store: ${e.message}")
            return
        }

        val result = JSObject()
        result.put("songs", songs)
        call.resolve(result)
    }

    @PluginMethod
    fun getAlbumArt(call: PluginCall) {
        val albumId = call.getString("albumId")?.toLongOrNull()
        if (albumId == null) {
            call.reject("albumId required")
            return
        }

        val artUri = ContentUris.withAppendedId(
            android.net.Uri.parse("content://media/external/audio/albumart"),
            albumId
        )

        val result = JSObject()
        result.put("uri", artUri.toString())
        call.resolve(result)
    }
}
