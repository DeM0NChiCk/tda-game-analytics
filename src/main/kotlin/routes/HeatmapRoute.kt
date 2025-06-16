package ru.itis.tda.routes

import com.mongodb.client.model.Projections.fields
import com.mongodb.client.model.Projections.include
import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.float
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

import org.litote.kmongo.eq
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent

@Serializable
data class Voxel(
    val x0: Float, val x1: Float,
    val y0: Float, val y1: Float,
    val z0: Float, val z1: Float,
    val value: Int,
    val log_value: Double
)

@Serializable
data class HeatmapResponse(
    val location: String,
    val bins: Int,
    val min_value: Int,
    val p90_value: Int,
    val max_value: Int,
    val voxels: List<Voxel>
)

fun Route.heatmapRoute() {
    get("/api/heatmap") {
        val game = call.request.queryParameters["game"]
        val location = call.request.queryParameters["location"]
        val bins = call.request.queryParameters["bins"]?.toIntOrNull()?.coerceAtLeast(4) ?: 25

        if (game.isNullOrBlank() || location.isNullOrBlank()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("detail" to "Missing game or location"))
            return@get
        }

        // 1. Загрузка координат
        val coords = mutableListOf<List<Float>>()
        val documents = MongoClientProvider.events
            .find(GameEvent::gameId eq game)
            .projection(fields(include("data")))
            .batchSize(500)
            .toList()

        for (doc in documents) {
            val userActions = doc.data.jsonObject["user_actions"]?.jsonArray
            userActions?.forEach { act ->
                val meta = act.jsonObject["metadata"]?.jsonObject ?: return@forEach
                if (meta["location"]?.jsonPrimitive?.content == location &&
                    meta.containsKey("x") && meta.containsKey("y") && meta.containsKey("z")
                ) {
                    val x = meta["x"]!!.jsonPrimitive.float
                    val y = meta["y"]!!.jsonPrimitive.float
                    val z = meta["z"]!!.jsonPrimitive.float
                    coords.add(listOf(x, y, z))
                }
            }
        }

        if (coords.isEmpty()) {
            call.respond(
                HeatmapResponse(
                    location,
                    bins,
                    0,
                    0,
                    0,
                    emptyList()
                )
            )
            return@get
        }

        // 2. Построение 3D-гистограммы вручную
        val xs = coords.map { it[0] }
        val ys = coords.map { it[1] }
        val zs = coords.map { it[2] }

        fun binEdges(values: List<Float>, bins: Int): List<Float> {
            val min = values.min()
            val max = values.max()
            val step = (max - min) / bins
            return (0..bins).map { min + it * step }
        }

        val xEdges = binEdges(xs, bins)
        val yEdges = binEdges(ys, bins)
        val zEdges = binEdges(zs, bins)

        val hist = Array(bins) { Array(bins) { IntArray(bins) } }

        coords.forEach { (x, y, z) ->
            val xi = xEdges.indexOfLast { it <= x }.coerceAtMost(bins - 1)
            val yi = yEdges.indexOfLast { it <= y }.coerceAtMost(bins - 1)
            val zi = zEdges.indexOfLast { it <= z }.coerceAtMost(bins - 1)
            hist[xi][yi][zi]++
        }

        val flatCounts = mutableListOf<Int>()
        val voxels = mutableListOf<Voxel>()
        for (ix in 0 until bins) {
            for (iy in 0 until bins) {
                for (iz in 0 until bins) {
                    val v = hist[ix][iy][iz]
                    if (v == 0) continue
                    flatCounts.add(v)
                    voxels.add(
                        Voxel(
                            x0 = xEdges[ix], x1 = xEdges[ix + 1],
                            y0 = yEdges[iy], y1 = yEdges[iy + 1],
                            z0 = zEdges[iz], z1 = zEdges[iz + 1],
                            value = v,
                            log_value = kotlin.math.log10(v + 1.0)
                        )
                    )
                }
            }
        }

        // 3. Вычисление статистик
        val maxValue = flatCounts.maxOrNull() ?: 0
        val minValue = flatCounts.minOrNull() ?: 0
        val p90Value = flatCounts.sorted().let { it[(0.9 * it.size).toInt().coerceAtMost(it.lastIndex)] }

        // 4. Ответ
        call.respond(
            HeatmapResponse(
                location = location,
                bins = bins,
                min_value = minValue,
                p90_value = p90Value,
                max_value = maxValue,
                voxels = voxels
            )
        )
    }
}