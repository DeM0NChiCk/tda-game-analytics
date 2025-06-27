package ru.itis.tda.routes

import com.mongodb.client.model.Filters.eq
import io.ktor.http.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

import kotlinx.serialization.Serializable
import org.bson.BsonDocument
import org.litote.kmongo.and
import org.litote.kmongo.eq
import org.bson.types.ObjectId

import org.litote.kmongo.coroutine.CoroutineCollection
import ru.itis.tda.db.MongoClientProvider

import ru.itis.tda.models.Game
import ru.itis.tda.models.GameEvent
import ru.itis.tda.models.User

@Serializable
data class CreateGameRequest(val name: String)

@Serializable
data class CreateGameResponse(val message: String, val gameId: String)

@Serializable
data class ErrorResponse(val error: String)

fun Route.gameRoute(
    userCollection: CoroutineCollection<User>,
    gameCollection: CoroutineCollection<Game>
) {
    get("/api/me") {
        val principal = call.principal<JWTPrincipal>()
        val apiKey = principal?.getClaim("apiKey", String::class)

        val user = userCollection.findOne(User::apiKey eq apiKey)

        if (user == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("Invalid user"))
            return@get
        } else {
            call.respond(mapOf(
                "email" to user.email,
                "apiKey" to user.apiKey
            ))
        }
    }

    post("/api/create-game") {
        val principal = call.principal<JWTPrincipal>()
        val apiKey = principal?.getClaim("apiKey", String::class)

        if (apiKey == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing apiKey in token"))
            return@post
        }

        val request = call.receive<CreateGameRequest>()

        if (request.name.isBlank()) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing game name"))
            return@post
        }

        val user = userCollection.findOne(User::apiKey eq apiKey)

        if (user == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
            return@post
        }

        val existing = gameCollection.findOne(
            and(
                Game::ownerApiKey eq apiKey,
                Game::name eq request.name
            )
        )

        if (existing != null) {
            call.respond(HttpStatusCode.Conflict, ErrorResponse("Game with this name already exists"))
            return@post
        }

        val game = Game(ownerApiKey = apiKey, name = request.name)
        gameCollection.insertOne(game)

        call.respond(HttpStatusCode.OK, CreateGameResponse("Game created", game.id.toHexString()))
    }

    get("/api/games") {
        val principal = call.principal<JWTPrincipal>()
        val apiKey = principal?.getClaim("apiKey", String::class)

        if (apiKey == null) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing apiKey in token"))
            return@get
        }

        val user = userCollection.findOne(User::apiKey eq apiKey)
        if (user == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
            return@get
        }

        try {
            val games = gameCollection.find(Game::ownerApiKey eq apiKey).toList()

            val response = games.map {
                mapOf(
                    "id" to it.id.toHexString(),
                    "game_name" to it.name
                )
            }

            call.respond(response)
        } catch (e: Exception) {
            println("Error fetching games: ${e.message}")
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Internal server error"))
        }
    }

    get("/api/locations/") {
        val gameId = call.request.queryParameters["gameId"]
        val principal = call.principal<JWTPrincipal>()
        val apiKey = principal?.getClaim("apiKey", String::class)

        if (gameId.isNullOrBlank()) {
            call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing gameId"))
            return@get
        }

        if (apiKey.isNullOrBlank()) {
            call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing apiKey in token"))
            return@get
        }

        val game = gameCollection.findOne(
            and(Game::id eq ObjectId(gameId), Game::ownerApiKey eq apiKey)
        )

        if (game == null) {
            call.respond(HttpStatusCode.NotFound, ErrorResponse("Game not found"))
            return@get
        }

        try {
            val eventsData = MongoClientProvider.events
                .withDocumentClass<BsonDocument>()
                .find(and(eq("gameId", gameId), eq("type", "heatmap_voxels")))
                .projection(GameEvent::data)
                .toList()

            val locations = eventsData.mapNotNull { bsonDoc ->
                try {
                    val dataDoc = bsonDoc.getDocument("data")
                    dataDoc?.getDocument("levelName")
                        ?.getString("content")
                        ?.value
                } catch (e: Exception) {
                    null
                }
            }.distinct()

            call.respond(locations)
        } catch (e: Exception) {
            call.application.environment.log.error("Failed to fetch locations", e)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch locations"))
        }
    }
}