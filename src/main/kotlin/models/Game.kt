package ru.itis.tda.models

import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.bson.codecs.pojo.annotations.BsonId
import org.bson.types.ObjectId

@Serializable
data class Game (
    @BsonId @Contextual val id: ObjectId = ObjectId(),
    val ownerApiKey: String,
    val name: String,
    val createdAt: Long = System.currentTimeMillis()
)