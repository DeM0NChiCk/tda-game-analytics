package ru.itis.tda.routes

import com.mongodb.client.model.Filters.eq
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable
import org.bson.BsonDocument
import org.bson.types.ObjectId
import org.litote.kmongo.and
import org.litote.kmongo.eq
import org.litote.kmongo.coroutine.CoroutineCollection
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.Game
import ru.itis.tda.models.GameEvent

fun Route.analyticsRoutes(gameCollection: CoroutineCollection<Game>) {

    route("/api/analytics") {
        get("/task-success") { call.handleTaskSuccess(gameCollection) }
        get("/task-duration") { call.handleTaskDuration(gameCollection) }
        get("/fixation-areas") { call.handleFixationAreas(gameCollection) }
        get("/seq-ratings") { call.handleSeqRatings(gameCollection) }
        get("/stimuli") { call.handleStimuliStats(gameCollection) }
        get("/fps-average") { call.handleFpsAverage(gameCollection) }
        get("/client-info") { call.handleClientInfo(gameCollection) }
    }
}

suspend fun ApplicationCall.handleTaskSuccess(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val results = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "task_result")))
            .projection(GameEvent::data)
            .toList()

        val stats = mutableMapOf<String, MutableMap<String, Int>>()

        results.forEach { doc ->
            try {
                val data = doc.getDocument("data")

                val taskId = data.getDocument("taskId")
                    ?.getString("content")
                    ?.value ?: return@forEach

                val success = data.getDocument("success")
                    ?.getString("content")
                    ?.value
                    ?.toBooleanStrictOrNull() ?: false

                val abandoned = data.getDocument("abandoned")
                    ?.getString("content")
                    ?.value
                    ?.toBooleanStrictOrNull() ?: false

                val fail = data.getDocument("fail")
                    ?.getString("content")
                    ?.value
                    ?.toBooleanStrictOrNull() ?: false

                val taskStats = stats.computeIfAbsent(taskId) {
                    mutableMapOf("success" to 0, "fail" to 0, "abandoned" to 0)
                }

                when {
                    abandoned -> taskStats["abandoned"] = taskStats["abandoned"]!! + 1
                    success -> taskStats["success"] = taskStats["success"]!! + 1
                    fail -> taskStats["fail"] = taskStats["fail"]!! + 1
                }

            } catch (_: Exception) {
            }
        }

        respond(stats)
    }
}

suspend fun ApplicationCall.handleTaskDuration(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val events = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "task_end")))
            .projection(GameEvent::data)
            .toList()

        val taskDurations = mutableMapOf<String, MutableList<Long>>()

        events.forEach { doc ->
            try {
                val data = doc.getDocument("data")

                val taskId = data.getDocument("taskId")
                    ?.getString("content")
                    ?.value ?: return@forEach

                val durationStr = data.getDocument("duration")
                    ?.getString("content")
                    ?.value ?: return@forEach

                val duration = durationStr.toLongOrNull() ?: return@forEach

                taskDurations.computeIfAbsent(taskId) { mutableListOf() }.add(duration)

            } catch (_: Exception) {
                // log if needed
            }
        }

        val result = taskDurations.mapValues { (_, durations) ->
            mapOf(
                "average" to durations.average().toLong(),
                "min" to durations.minOrNull(),
                "max" to durations.maxOrNull()
            )
        }

        respond(result)
    }
}

@Serializable
data class AOICoordinate(
    val x: Int,
    val y: Int
)

@Serializable
data class AOIResponse(
    val count: Int,
    val avgDuration: Int,
    val coordinates: List<AOICoordinate>
)

suspend fun ApplicationCall.handleFixationAreas(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val fixations = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "fixation")))
            .toList()

        data class AOIStats(
            var count: Int = 0,
            var totalDuration: Int = 0,
            val coordinates: MutableList<AOICoordinate> = mutableListOf()
        )

        val aoiMap = mutableMapOf<String, AOIStats>()

        fixations.forEach { doc ->
            try {
                val data = doc.getDocument("data")
                val aoi = data.getDocument("aoi").getString("content").value

                val duration = data.getDocument("duration").getString("content").value.toInt()
                val x = data.getDocument("x").getString("content").value.toInt()
                val y = data.getDocument("y").getString("content").value.toInt()

                val stats = aoiMap.getOrPut(aoi) { AOIStats() }
                stats.count++
                stats.totalDuration += duration
                stats.coordinates.add(AOICoordinate(x, y))

            } catch (_: Exception) {
            }
        }

        val result: Map<String, AOIResponse> = aoiMap.mapValues { (_, stats) ->
            AOIResponse(
                count = stats.count,
                avgDuration = if (stats.count > 0) stats.totalDuration / stats.count else 0,
                coordinates = stats.coordinates
            )
        }

        respond(result)
    }
}

suspend fun ApplicationCall.handleSeqRatings(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val seqs = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "seq")))
            .projection(GameEvent::data)
            .toList()

        val ratings = mutableMapOf<String, MutableList<Int>>()

        seqs.forEach { doc ->
            try {
                val data = doc.getDocument("data")
                val taskId = data.getDocument("taskId").getString("content").value
                val ratingStr = data.getDocument("rating").getString("content").value
                val rating = ratingStr.toIntOrNull() ?: return@forEach
                ratings.computeIfAbsent(taskId) { mutableListOf() }.add(rating)
            } catch (_: Exception) {}
        }

        val averages = ratings.mapValues { it.value.average() }
        respond(averages)
    }
}

suspend fun ApplicationCall.handleStimuliStats(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val events = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "stimulus_shown")))
            .projection(GameEvent::data)
            .toList()

        val result = mutableMapOf<String, MutableMap<String, Int>>()

        events.forEach { doc ->
            try {
                val data = doc.getDocument("data")
                val stim = data.getDocument("stimulusId").getString("content").value
                val aoi = data.getDocument("aoi").getString("content").value

                val stimMap = result.computeIfAbsent(stim) { mutableMapOf() }
                stimMap[aoi] = stimMap.getOrDefault(aoi, 0) + 1
            } catch (_: Exception) {}
        }

        respond(result)
    }
}

suspend fun ApplicationCall.withGameContext(
    gameCollection: CoroutineCollection<Game>,
    block: suspend (gameId: String, apiKey: String) -> Unit
) {
    val gameId = request.queryParameters["gameId"]
    val principal = principal<JWTPrincipal>()
    val apiKey = principal?.getClaim("apiKey", String::class)

    if (gameId.isNullOrBlank()) {
        respond(HttpStatusCode.BadRequest, ErrorResponse("Missing gameId"))
        return
    }
    if (apiKey.isNullOrBlank()) {
        respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing apiKey in token"))
        return
    }
    val game = gameCollection.findOne(
        and(
            Game::id eq ObjectId(gameId),
            Game::ownerApiKey eq apiKey
        )
    )
    if (game == null) {
        respond(HttpStatusCode.NotFound, ErrorResponse("Game not found"))
        return
    }
    block(gameId, apiKey)
}

@Serializable
data class FpsAverageEntry(
    val sessionId: String,
    val averageFps: Double,
    val intervalMs: Long,
    val count: Int
)

suspend fun ApplicationCall.handleFpsAverage(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val fpsEvents = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "fps_average")))
            .toList()

        val result = mutableListOf<FpsAverageEntry>()

        fpsEvents.forEach { doc ->
            try {
                val data = doc.getDocument("data")
                val sessionId = doc.getString("sessionId")?.value ?: return@forEach

                val averageFps = data.getDocument("average_fps").getString("content").value.toDouble()
                val interval = data.getDocument("interval").getString("content").value.toLong()
                val count = data.getDocument("count").getString("content").value.toInt()

                result += FpsAverageEntry(
                    sessionId = sessionId,
                    averageFps = averageFps,
                    intervalMs = interval,
                    count = count
                )

            } catch (_: Exception) {
            }
        }

        respond(result)
    }
}

suspend fun ApplicationCall.handleClientInfo(gameCollection: CoroutineCollection<Game>) {
    withGameContext(gameCollection) { gameId, _ ->
        val events = MongoClientProvider.events
            .withDocumentClass<BsonDocument>()
            .find(and(eq("gameId", gameId), eq("type", "client_info")))
            .toList()

        val userAgentCounts = mutableMapOf<String, Int>()
        val languageCounts = mutableMapOf<String, Int>()

        events.forEach { doc ->
            try {
                val data = doc.getDocument("data")

                val userAgent = data.getDocument("userAgent")
                    .getString("content")
                    .value

                val language = data.getDocument("language")
                    .getString("content")
                    .value

                userAgentCounts[userAgent] = userAgentCounts.getOrDefault(userAgent, 0) + 1
                languageCounts[language] = languageCounts.getOrDefault(language, 0) + 1

            } catch (_: Exception) {
            }
        }

        respond(
            mapOf(
                "userAgents" to userAgentCounts,
                "languages" to languageCounts
            )
        )
    }
}

