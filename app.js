(function(){
  const $ = (sel) => document.querySelector(sel);
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
  $('#year').textContent = new Date().getFullYear();

  const inr = (n) => isFinite(n) ? new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n) : '–';

  function emi(P, annualRate, years){
    const r = (annualRate/100)/12, n = years*12;
    if (r === 0) return {mi: P/n, totalInterest: 0, totalPayment: P};
    const mi = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
    const total = mi*n;
    return {mi, totalInterest: total-P, totalPayment: total};
  }

  function simulateTaxInterest(P, rate, years, horizon, taxCap, slab){
    const r = (rate/100)/12, n = years*12;
    const e = emi(P, rate, years);
    let bal = P, k=0;
    let totalInterest=0, totalTaxSaved=0;
    for (let y=1; y<=horizon; y++){
      let interestYear=0;
      for (let m=1; m<=12; m++){
        const interest = bal*r;
        const principal = Math.min(e.mi - interest, bal);
        bal = Math.max(0, bal - principal);
        totalInterest += interest;
        interestYear += interest;
        k++; if (k>=n || bal<=0) break;
      }
      totalTaxSaved += Math.min(interestYear, taxCap) * slab;
      if (k>=n || bal<=0) break;
    }
    return {totalInterest, totalTaxSaved, emi: e.mi, months: Math.min(k, n)};
  }

  // Buy vs Rent with one-time costs
  $('#bvr_calc').addEventListener('click', ()=>{
    const price = +$('#bvr_price').value;
    const down = +$('#bvr_down').value;
    const rate = +$('#bvr_rate').value;
    const years = +$('#bvr_years').value;
    const rent0 = +$('#bvr_rent').value;
    const rentInf = +$('#bvr_rentInf').value/100;
    const homeInf = +$('#bvr_homeInf').value/100;
    const maintPct = +$('#bvr_maintPct').value/100;
    const taxCap = +$('#bvr_taxCap').value;
    const taxSlab = +$('#bvr_taxSlab').value/100;
    const horizon = Math.min(years, +$('#bvr_horizon').value);

    const stamp = +$('#bvr_stamp').value/100;
    const reg = +$('#bvr_reg').value/100;
    const gst = +$('#bvr_gst').value/100;
    const oneTime = price*(stamp+reg+gst);

    const loan = Math.max(0, price - down);
    const e = emi(loan, rate, years);
    $('#bvr_out_emi').textContent = inr(e.mi);

    // Simulations
    const r = (rate/100)/12, n = years*12;
    let bal = loan, k=0;
    let totalInterest=0, totalTax=0, totalMaint=0, totalRent=0;
    for (let y=1; y<=horizon; y++){
      let interestYear = 0;
      for (let m=1; m<=12; m++){
        const interest = bal*r;
        const principal = Math.min(e.mi - interest, bal);
        bal = Math.max(0, bal - principal);
        totalInterest += interest; interestYear += interest;
        k++; if (k>=n || bal<=0) break;
      }
      totalTax += Math.min(interestYear, taxCap) * taxSlab;
      totalMaint += price*Math.pow(1+homeInf, y-1)*maintPct;
      totalRent  += rent0*Math.pow(1+rentInf, y-1)*12;
      if (k>=n || bal<=0) break;
    }

    const priceAfter = price*Math.pow(1+homeInf, horizon);
    const equityGain = Math.max(0, priceAfter - price);
    const buyCashOut = down + (e.mi*Math.min(n, horizon*12)) + totalMaint + oneTime;
    const netBuy = buyCashOut - totalTax - equityGain;

    $('#bvr_out_interest').textContent = inr(totalInterest);
    $('#bvr_out_taxSaved').textContent = inr(totalTax);
    $('#bvr_out_onetime').textContent = inr(oneTime);
    $('#bvr_out_net').textContent = inr(netBuy);
    $('#bvr_compare').textContent = `Rent outlay over ${horizon}y ≈ ${inr(totalRent)}. Net Buy ${netBuy <= totalRent ? 'beats' : 'trails'} Rent by ${inr(Math.abs(netBuy-totalRent))}.`;
    $('#bvr_results').hidden = false;
  });

  // EMI basic
  $('#emi_calc').addEventListener('click', ()=>{
    const e = emi(+$('#emi_p').value, +$('#emi_r').value, +$('#emi_y').value);
    $('#emi_out_mi').textContent = inr(e.mi);
    $('#emi_out_int').textContent = inr(e.totalInterest);
    $('#emi_out_total').textContent = inr(e.totalPayment);
    $('#emi_results').hidden = false;
  });

  // SIP
  $('#sip_calc').addEventListener('click', ()=>{
    const m = +$('#sip_m').value;
    const r = (+$('#sip_r').value)/100/12;
    const n = +$('#sip_y').value * 12;
    const corpus = r === 0 ? m*n : m*(Math.pow(1+r, n)-1)*(1+r)/r;
    const invested = m*n;
    $('#sip_out_corpus').textContent = inr(corpus);
    $('#sip_out_invested').textContent = inr(invested);
    $('#sip_out_gains').textContent = inr(corpus - invested);
    $('#sip_results').hidden = false;
  });

  // Lumpsum
  $('#ls_calc').addEventListener('click', ()=>{
    const p = +$('#ls_p').value, r = +$('#ls_r').value/100, y = +$('#ls_y').value;
    const fv = p*Math.pow(1+r, y);
    $('#ls_out_fv').textContent = inr(fv);
    $('#ls_out_gain').textContent = inr(fv - p);
    $('#ls_results').hidden = false;
  });

  // Amortization with prepayment
  $('#am_calc').addEventListener('click', ()=>{
    const P = +$('#am_p').value, R = +$('#am_r').value, Y=+$('#am_y').value;
    const PP = +$('#am_pp').value, PPM = Math.min(12, Math.max(1, +$('#am_ppm').value|0));
    const r = (R/100)/12, n = Y*12;
    const e = emi(P, R, Y);
    let bal = P, totalInterest=0, months=0;
    const tbody = document.querySelector('#am_table tbody');
    tbody.innerHTML='';
    for (let i=1; i<=n; i++){
      const interest = bal*r;
      const principal = Math.min(e.mi - interest, bal);
      bal = Math.max(0, bal - principal);
      totalInterest += interest;
      months = i;
      if (i%12===PPM && PP>0 && bal>0){
        bal = Math.max(0, bal - PP);
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i}</td><td>${inr(interest)}</td><td>${inr(principal)}</td><td>${inr(bal)}</td>`;
      tbody.appendChild(tr);
      if (bal<=0) break;
    }
    $('#am_out_mi').textContent = inr(e.mi);
    $('#am_out_int').textContent = inr(totalInterest);
    $('#am_out_months').textContent = months;
    $('#amort_results').hidden = false;
  });

  // REIT
  $('#reit_calc').addEventListener('click', ()=>{
    const price = +$('#reit_p').value, div = +$('#reit_d').value;
    const y = price>0 ? (div/price)*100 : NaN;
    $('#reit_out_yield').textContent = isFinite(y) ? y.toFixed(2)+'%' : '–';
    $('#reit_results').hidden = false;
  });

  // Zero Net Interest — solve loan
  $('#zni_calc').addEventListener('click', ()=>{
    const rate = +$('#zni_rate').value, years=+$('#zni_years').value, horizon=+$('#zni_horizon').value;
    const cap = +$('#zni_taxCap').value, slab = +$('#zni_slab').value/100;
    // Binary search loan where totalInterest - totalTaxSaved <= 0
    let lo=0, hi=10**9; // up to ₹1000 cr
    for (let iter=0; iter<80; iter++){
      const mid = (lo+hi)/2;
      const {totalInterest, totalTaxSaved, emi:mi} = simulateTaxInterest(mid, rate, years, horizon, cap, slab);
      const net = totalInterest - totalTaxSaved;
      if (net <= 0) hi = mid; else lo = mid;
    }
    const loan = (lo+hi)/2;
    const e = emi(loan, rate, years);
    $('#zni_out_loan').textContent = inr(loan);
    $('#zni_out_emi').textContent = inr(e.mi);
    $('#zni_results').hidden = false;
  });

  // Zero Net Interest — solve price with given down
  $('#znp_calc').addEventListener('click', ()=>{
    const down = +$('#znp_down').value, rate=+$('#znp_rate').value, years=+$('#znp_years').value;
    const horizon=+$('#znp_horizon').value, cap=+$('#znp_taxCap').value, slab=+$('#znp_slab').value/100;
    // price = down + loan; search loan
    let lo=0, hi=10**9;
    for (let iter=0; iter<80; iter++){
      const mid = (lo+hi)/2;
      const {totalInterest, totalTaxSaved} = simulateTaxInterest(mid, rate, years, horizon, cap, slab);
      const net = totalInterest - totalTaxSaved;
      if (net <= 0) hi = mid; else lo = mid;
    }
    const loan=(lo+hi)/2;
    $('#znp_out_price').textContent = inr(down + loan);
    $('#znp_results').hidden = false;
  });

  // Break-even search
  $('#be_calc').addEventListener('click', ()=>{
    const price=+$('#be_price').value, down=+$('#be_down').value, rate=+$('#be_rate').value, years=+$('#be_years').value;
    const rent0=+$('#be_rent').value, rentInf=+$('#be_rentInf').value/100, homeInf=+$('#be_homeInf').value/100, maintPct=+$('#be_maint').value/100;
    const cap=+$('#be_cap').value, slab=+$('#be_slab').value/100, maxY=+$('#be_max').value;
    const loan = Math.max(0, price - down);
    const e = emi(loan, rate, years);
    function horizonNet(h){
      // compute net buy and rent over h years
      const r = (rate/100)/12, n = years*12;
      let bal = loan, k=0;
      let totInt=0, totTax=0, totMaint=0, totRent=0;
      for (let y=1; y<=h; y++){
        let I=0;
        for (let m=1;m<=12;m++){
          const ii = bal*r;
          const pp = Math.min(e.mi - ii, bal);
          bal = Math.max(0, bal - pp);
          totInt += ii; I += ii;
          k++; if (k>=n || bal<=0) break;
        }
        totTax += Math.min(I, cap) * slab;
        totMaint += price*Math.pow(1+homeInf, y-1)*maintPct;
        totRent  += rent0*Math.pow(1+rentInf, y-1)*12;
        if (k>=n || bal<=0) break;
      }
      const priceAfter = price*Math.pow(1+homeInf, h);
      const equityGain = Math.max(0, priceAfter - price);
      const cashOut = down + (e.mi*Math.min(n, h*12)) + totMaint;
      const netBuy = cashOut - totTax - equityGain;
      return {netBuy, totRent};
    }
    let ans = null;
    for (let h=1; h<=maxY; h++){
      const {netBuy, totRent} = horizonNet(h);
      if (netBuy <= totRent){ ans = h; break; }
    }
    $('#be_out_year').textContent = ans ? ans : 'Not within range';
    $('#be_out_emi').textContent = inr(e.mi);
    $('#be_results').hidden = false;
  });

})();
