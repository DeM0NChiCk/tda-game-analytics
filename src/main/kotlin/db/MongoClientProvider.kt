package ru.itis.tda.db

import com.mongodb.client.model.CreateCollectionOptions
import com.mongodb.client.model.TimeSeriesOptions
import kotlinx.coroutines.runBlocking
import org.litote.kmongo.coroutine.coroutine
import org.litote.kmongo.reactivestreams.KMongo
import ru.itis.tda.models.Game
import ru.itis.tda.models.GameEvent
import ru.itis.tda.models.User

object MongoClientProvider {
    private val client = KMongo.createClient("mongodb://localhost:27017").coroutine
    val database = client.getDatabase("tda-analytics")
    val events = database.getCollection<GameEvent>("events")
    val users = database.getCollection<User>("users")
    val games = database.getCollection<Game>("games")

    init {
        runBlocking {
            // Ensure time-series collection exists
            val collections = database.listCollectionNames().toList()
            if (!collections.contains("events")) {
                database.createCollection("events", CreateCollectionOptions().timeSeriesOptions(
                    TimeSeriesOptions("timestamp").metaField("gameId")
                ))
            }
        }
    }
}