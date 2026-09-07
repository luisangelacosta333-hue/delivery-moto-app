window.procesarPagoIA = async function() {
    var fileInput = document.getElementById('file-comprobante');
    var file = fileInput.files[0];
    
    if(!file) {
        mostrarToast("Por favor adjuntá el comprobante primero.", "info");
        return;
    }

    cerrarModal('modal-pago');
    abrirModal('modal-ia');
    var txt = document.getElementById('texto-ia');
    var barra = document.getElementById('barra-ia');

    try {
        txt.innerText = "Subiendo comprobante al servidor...";
        barra.style.width = '30%';
        
        const { data: session } = await supabase.auth.getSession();
        if(!session || !session.session) throw new Error("Debes iniciar sesión");
        const userId = session.session.user.id;

        // 1. Subimos la foto del comprobante a Supabase
        const fileName = `pago_${userId}_${Date.now()}.jpg`;
        await supabase.storage.from('archivos_cadetes').upload(fileName, file);
        const compUrl = supabase.storage.from('archivos_cadetes').getPublicUrl(fileName).data.publicUrl;

        txt.innerText = "IA: Analizando transferencia...";
        barra.style.width = '60%';

        // Calculamos cuánto debe (ej: 3 viajes = $600)
        const deudaActual = window.viajesTotales * 200;

        // 2. Llamamos a nuestra API de Vercel para que la IA lo lea
        const aiReq = await fetch('/api/pago', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comprobante_url: compUrl,
                monto_esperado: deudaActual
            })
        });

        const aiRes = await aiReq.json();

        // 3. Si la IA da el OK
        if(aiRes.pago_valido) {
            txt.innerText = "IA: ¡Pago exitoso y validado!";
            barra.style.width = '90%';

            // Guardamos el registro en la base de datos
            await supabase.from('pagos_cadetes').insert([{
                cadete_id: userId,
                monto: aiRes.monto_leido,
                comprobante_url: compUrl,
                estado_ia: 'aprobado'
            }]);

            // Reseteamos los viajes en la base de datos a 0
            await supabase.from('cadetes').update({ viajes_totales: 0 }).eq('id', userId);

            barra.style.width = '100%'; 

            setTimeout(function(){
                cerrarModal('modal-ia');
                
                // Ponemos los marcadores de la pantalla en CERO
                var elemDeuda = document.getElementById('deuda-texto');
                if(elemDeuda){
                    elemDeuda.style.color = 'var(--verde)';
                    elemDeuda.innerText = '$ 0';
                }
                window.viajesTotales = 0;
                document.getElementById('contador-viajes').innerText = '0';
                document.getElementById('card-viajes').innerText = '0';
                
                mostrarToast("Pago validado por IA. Deuda en $0","success");
                barra.style.width = '0%';
                fileInput.value = ''; 
            }, 1500);

        } else {
            // Si la IA detecta que pagó de menos o es falso
            throw new Error(aiRes.motivo);
        }

    } catch (error) {
        cerrarModal('modal-ia');
        mostrarToast("Pago Rechazado: " + error.message, "info");
        barra.style.width = '0%';
    }
};
