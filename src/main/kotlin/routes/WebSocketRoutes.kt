package ru.itis.tda.routes

import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent

fun Route.webSocketRoutes() {
    webSocket("/ws/metrics") {
        for (frame in incoming) {
            when (frame) {
                is Frame.Text -> {
                    val text = frame.readText()
                    println("WS: $text")
                    try {
                        val event = Json.decodeFromString(GameEvent.serializer(), text)
                        launch {
                            MongoClientProvider.events.insertOne(event)
                        }
                    } catch (e: Exception) {
                        println("Invalid JSON: $e")
                    }
                }
                else -> {}
            }
        }
    }
}