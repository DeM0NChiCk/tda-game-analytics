package ru.itis.tda.service

import com.mongodb.client.model.Filters.eq
import kotlinx.serialization.Serializable
import org.bson.BsonDocument

import org.litote.kmongo.*
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent
import kotlin.math.*

@Serializable
data class HeatmapResponse(
    val location: String?,
    val bins: Int,
    val max_value: Int,
    val minX: Double,
    val minY: Double,
    val minZ: Double,
    val voxels: List<Voxel>
)

@Serializable
data class Voxel(
    val x0: Double,
    val x1: Double,
    val y0: Double,
    val y1: Double,
    val z0: Double,
    val z1: Double,
    val value: Int
)

@Serializable
data class Wrapper(
    val content: String
)

@Serializable
data class VoxelData(
    val x: Wrapper,
    val y: Wrapper,
    val z: Wrapper
)

@Serializable
data class EventData(
    val levelName: Wrapper,
    val voxels: List<VoxelData>
)

suspend fun heatmapService(game: String, location: String, bins: Int): HeatmapResponse {

    println("Запуск heatmapService для game=$game, location=$location, bins=$bins")

    val eventsData = MongoClientProvider.events
        .withDocumentClass<BsonDocument>()
        .find(
            and(
                eq("gameId", game),
                eq("type", "heatmap_voxels")
            )
        )
        .projection(GameEvent::data)
        .toList()

    println("Получено событий: ${eventsData.size}")

    val points = mutableListOf<Triple<Double, Double, Double>>()

    for ((index, bsonDoc) in eventsData.withIndex()) {
        try {
            val dataDoc = bsonDoc.getDocument("data")
            val levelNameDoc = dataDoc.getDocument("levelName")
            val currentLocation = levelNameDoc.getString("content").value

            if (currentLocation != location) {
                println("Пропуск события #$index — location отличается: $currentLocation")
                continue
            }

            val voxelsArray = dataDoc.getArray("voxels")

            for ((voxelIndex, voxelBson) in voxelsArray.withIndex()) {
                val voxelDoc = voxelBson.asDocument()

                val xContent = voxelDoc.getDocument("x").getString("content").value
                val yContent = voxelDoc.getDocument("y").getString("content").value
                val zContent = voxelDoc.getDocument("z").getString("content").value

                val x = xContent.toDoubleOrNull()
                val y = yContent.toDoubleOrNull()
                val z = zContent.toDoubleOrNull()

                if (x != null && y != null && z != null) {
                    points.add(Triple(x, y, z))
                } else {
                    println("Пропуск некорректного вокселя в событии #$index, voxel #$voxelIndex: x=$xContent, y=$yContent, z=$zContent")
                }
            }

        } catch (e: Exception) {
            println("Ошибка обработки события #$index: ${e.message}")
            continue
        }
    }

    println("Собрано точек: ${points.size}")

    if (points.isEmpty()) {
        println("Нет точек для построения тепловой карты, возвращаем пустой результат.")
        return HeatmapResponse(location, bins, 0, 0.0, 0.0, 0.0, emptyList())
    }

    val minX = points.minOf { it.first }
    val minY = points.minOf { it.second }
    val minZ = points.minOf { it.third }

    val maxX = points.maxOf { it.first }
    val maxY = points.maxOf { it.second }
    val maxZ = points.maxOf { it.third }

    val dx = (maxX - minX) / bins
    val dy = (maxY - minY) / bins
    val dz = (maxZ - minZ) / bins

    val map = mutableMapOf<Triple<Int, Int, Int>, Int>()

    for ((x, y, z) in points) {
        val xi = floor((x - minX) / dx).toInt().coerceIn(0, bins - 1)
        val yi = floor((y - minY) / dy).toInt().coerceIn(0, bins - 1)
        val zi = floor((z - minZ) / dz).toInt().coerceIn(0, bins - 1)
        val key = Triple(xi, yi, zi)
        map[key] = (map[key] ?: 0) + 1
    }

    val voxels = map.map { (key, count) ->
        val (xi, yi, zi) = key
        Voxel(
            x0 = minX + xi * dx,
            x1 = minX + (xi + 1) * dx,
            y0 = minY + yi * dy,
            y1 = minY + (yi + 1) * dy,
            z0 = minZ + zi * dz,
            z1 = minZ + (zi + 1) * dz,
            value = count
        )
    }

    println("Итоговые параметры: точек=${points.size}, вокселей=${voxels.size}, max_value=${voxels.maxOf { it.value }}")

    return HeatmapResponse(
        location = location,
        bins = bins,
        max_value = voxels.maxOf { it.value },
        minX = minX,
        minY = minY,
        minZ = minZ,
        voxels = voxels
    )
}