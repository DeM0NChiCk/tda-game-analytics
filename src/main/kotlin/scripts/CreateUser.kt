package ru.itis.tda.scripts

import kotlinx.coroutines.runBlocking
import org.bson.types.ObjectId
import ru.itis.tda.db.MongoClientProvider
import ru.itis.tda.models.User
import java.util.UUID

fun main() = runBlocking {
    // Генерируем случайный API ключ
    val apiKey = UUID.randomUUID().toString()
    
    // Создаем нового пользователя
    val user = User(
        id = ObjectId(),
        apiKey = apiKey
    )
    
    // Сохраняем пользователя в базу данных
    MongoClientProvider.users.insertOne(user)
    
    println("Новый пользователь создан!")
    println("API Key: $apiKey")
    println("Сохраните этот ключ, он понадобится для авторизации!")
} 