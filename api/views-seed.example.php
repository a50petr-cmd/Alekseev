<?php
/**
 * Пример файла инициализации счётчиков просмотров из Яндекс.Метрики.
 *
 * Копируйте в файл с тем же именем (views-seed.php) рядом с базой данных
 * на хостинге (директория ../petr-alekseev-data/ или api/data/).
 *
 * Инициализация произойдёт при первом обращении к api/views.php,
 * если файла views-seed.php нет, он будет создан с .seed расширением
 * для отметки обработки (чтобы не применить заново).
 *
 * Структура массива: ['slug' => количество_просмотров, ...]
 */

return [
    'franshiza-magazina-u-doma-oshibki' => 120,
    'hot-soup-slowed-delivery' => 85,
    'operations-director-outsourcing-when-needed' => 156,
    'darkstores-russia-october-2026' => 203,
];
