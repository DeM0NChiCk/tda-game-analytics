package ru.itis.tda.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.bson.types.ObjectId

import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent

import org.litote.kmongo.and
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.eq

import ru.itis.tda.models.Game

fun Route.collectRoutes(gameCollection: CoroutineCollection<Game>) {
    post("/collect") {
        val token = call.request.queryParameters["token"]
        val gameId = call.request.queryParameters["gameId"]


        if (token.isNullOrBlank() || gameId.isNullOrBlank()) {
            call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Missing token or gameId"))
            return@post
        }

        val game = gameCollection.findOne(
            and(
                Game::id eq ObjectId(gameId),
                Game::ownerApiKey eq token
            )
        )

        if (game == null) {
            println("User not found for token=$token and gameId=$gameId")
            call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Invalid token or gameId"))
            return@post
        }

        try {
            val events = call.receive<List<GameEvent>>()  // ✅ теперь принимаем массив

            for (event in events) {
                if (event.gameId != gameId) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "gameId in body does not match query")
                    )
                    return@post
                }

                MongoClientProvider.events.insertOne(event) // ✅ сохраняем по одному

                println("Событие принято: ${event.type}")
            }

            call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
        } catch (e: Exception) {
            println("Error parsing request body: ${e.message}")
            call.respondText(
                """
            Invalid request format. Expected JSON array of:
            {
                "gameId": "string",
                "sessionId": "string",
                "type": "string",
                "timestamp": number,
                "data": object
            }
            """.trimIndent(),
                status = HttpStatusCode.BadRequest
            )
        }
    }

}