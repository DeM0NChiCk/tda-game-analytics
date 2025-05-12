package ru.itis.tda.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.Contextual
import org.bson.codecs.pojo.annotations.BsonId
import org.bson.types.ObjectId

@Serializable
data class User(
    @BsonId @Contextual val id: ObjectId = ObjectId(),
    val apiKey: String
)