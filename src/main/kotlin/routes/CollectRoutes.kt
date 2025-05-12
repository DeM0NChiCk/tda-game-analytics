package ru.itis.tda.routes

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent

fun Route.collectRoutes() {
    post("/collect") {
        try {
            val event = call.receive<GameEvent>()
            MongoClientProvider.events.insertOne(event)
            call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
        } catch (e: Exception) {
            println("Error processing request: ${e.message}")
            call.respondText("""
                Invalid request format. Expected:
                {
                    "gameId": "string",
                    "sessionId": "string",
                    "type": "string",
                    "timestamp": number,
                    "data": object
                }
            """.trimIndent(), status = HttpStatusCode.BadRequest)
        }
    }
}