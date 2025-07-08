-- Script para crear triggers que mantengan sincronizado el campo votos en la tabla tatuajes
-- con el promedio real de comentarios_tatuajes.puntuacion

-- Eliminar triggers existentes si los hay
DROP TRIGGER IF EXISTS actualizar_votos_after_insert;
DROP TRIGGER IF EXISTS actualizar_votos_after_update;
DROP TRIGGER IF EXISTS actualizar_votos_after_delete;

-- Trigger para INSERT en comentarios_tatuajes
DELIMITER //
CREATE TRIGGER actualizar_votos_after_insert
AFTER INSERT ON comentarios_tatuajes
FOR EACH ROW
BEGIN
    DECLARE nuevo_promedio DECIMAL(3,1);
    
    -- Calcular el nuevo promedio de votos
    SELECT AVG(puntuacion) INTO nuevo_promedio
    FROM comentarios_tatuajes 
    WHERE id_tatuaje = NEW.id_tatuaje;
    
    -- Actualizar el campo votos en la tabla tatuajes
    UPDATE tatuajes 
    SET votos = COALESCE(nuevo_promedio, 0)
    WHERE id_tatuaje = NEW.id_tatuaje;
END//
DELIMITER ;

-- Trigger para UPDATE en comentarios_tatuajes
DELIMITER //
CREATE TRIGGER actualizar_votos_after_update
AFTER UPDATE ON comentarios_tatuajes
FOR EACH ROW
BEGIN
    DECLARE nuevo_promedio DECIMAL(3,1);
    
    -- Calcular el nuevo promedio de votos
    SELECT AVG(puntuacion) INTO nuevo_promedio
    FROM comentarios_tatuajes 
    WHERE id_tatuaje = NEW.id_tatuaje;
    
    -- Actualizar el campo votos en la tabla tatuajes
    UPDATE tatuajes 
    SET votos = COALESCE(nuevo_promedio, 0)
    WHERE id_tatuaje = NEW.id_tatuaje;
END//
DELIMITER ;

-- Trigger para DELETE en comentarios_tatuajes
DELIMITER //
CREATE TRIGGER actualizar_votos_after_delete
AFTER DELETE ON comentarios_tatuajes
FOR EACH ROW
BEGIN
    DECLARE nuevo_promedio DECIMAL(3,1);
    
    -- Calcular el nuevo promedio de votos
    SELECT AVG(puntuacion) INTO nuevo_promedio
    FROM comentarios_tatuajes 
    WHERE id_tatuaje = OLD.id_tatuaje;
    
    -- Actualizar el campo votos en la tabla tatuajes
    UPDATE tatuajes 
    SET votos = COALESCE(nuevo_promedio, 0)
    WHERE id_tatuaje = OLD.id_tatuaje;
END//
DELIMITER ;

-- Verificar que los triggers se crearon correctamente
SHOW TRIGGERS LIKE 'actualizar_votos%'; 