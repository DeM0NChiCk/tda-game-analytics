package ru.itis.tda.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import ru.itis.tda.serialization.DateSerializer
import java.util.Date

@Serializable
data class GameEvent(
    val gameId: String,
    val sessionId: String,
    val type: String,
    @Serializable(with = DateSerializer::class) val timestamp: Date,
    val data: JsonObject
)