package ru.itis.tda.routes

import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*

import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import org.bson.types.ObjectId
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.GameEvent

import org.litote.kmongo.and
import org.litote.kmongo.coroutine.CoroutineCollection
import org.litote.kmongo.eq

import ru.itis.tda.models.Game

fun Route.webSocketRoutes(gameCollection: CoroutineCollection<Game>) {
    webSocket("/ws/metrics") {

        val token = call.request.queryParameters["token"]
        val gameId = call.request.queryParameters["gameId"]

        if (token.isNullOrBlank() || gameId.isNullOrBlank()) {
            println("Отклонено подключение: отсутствует token или gameId")
            close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "Missing token or gameId"))
            return@webSocket
        }

        val game = gameCollection.findOne(
            and(
                Game::id eq ObjectId(gameId),
                Game::ownerApiKey eq token
            )
        )

        if (game == null) {
            println("Отклонено подключение: невалидный token или gameId")
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Invalid token or gameId"))
            return@webSocket
        }

        println("WS подключение подтверждено: gameId=$gameId, userToken=$token, gameName=${game.name}")


        for (frame in incoming) {
            when (frame) {
                is Frame.Text -> {
                    val text = frame.readText()
                    println("WS: $text")

                    try {
                        val event = Json.decodeFromString(GameEvent.serializer(), text)

                        if (event.gameId != gameId) {
                            println("Несовпадение gameId. Ожидалось: $gameId, получено: ${event.gameId}")
                            continue
                        }

                        launch {
                            MongoClientProvider.events.insertOne(event)
                        }

                        println("Событие принято: ${event.type}")

                    } catch (e: Exception) {
                        println("Ошибка парсинга события: $e")
                    }
                }
                else -> {}
            }
        }
    }
}